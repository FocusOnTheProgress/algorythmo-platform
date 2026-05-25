# frozen_string_literal: true

require 'rails_helper'

# Tests for Algorythmo::Analytics::PipelineMetrics.
#
# Test cache strategy:
#   Rails.cache is :null_store in test (config/environments/test.rb), so the
#   service's Rails.cache.fetch always misses by default. The "cache hit"
#   examples swap in a MemoryStore for the duration of the example so that
#   the second call exercises the cached path.
RSpec.describe Algorythmo::Analytics::PipelineMetrics do
  let(:account)  { create(:account) }
  let(:contact)  { create(:contact, account: account) }

  let(:pipeline) do
    p = Algorythmo::Pipeline.create!(account: account, name: 'Main')
    Algorythmo::Stage.create!(pipeline: p, name: 'Novo',           kind: :open, position: 0, aging_coefficient: 1.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Qualificado',    kind: :open, position: 1, aging_coefficient: 4.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Proposta',       kind: :open, position: 2, aging_coefficient: 2.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Fechado ganho',  kind: :won,  position: 3, aging_coefficient: 0.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Fechado perdido', kind: :lost, position: 4, aging_coefficient: 0.0)
    p.reload
  end

  let(:novo)     { pipeline.stages.find_by(name: 'Novo') }
  let(:qual)     { pipeline.stages.find_by(name: 'Qualificado') }
  let(:proposta) { pipeline.stages.find_by(name: 'Proposta') }
  let(:won)      { pipeline.stages.find_by(name: 'Fechado ganho') }
  let(:lost)     { pipeline.stages.find_by(name: 'Fechado perdido') }

  # Builds a Lead at the given stage with a creation history row. Bypasses the
  # listener (we already have a controlled environment) but matches its effect.
  def create_lead(stage:, entered_at: Time.current, contact_override: nil)
    lead = Algorythmo::Lead.create!(
      account: account,
      contact: contact_override || create(:contact, account: account),
      stage: stage,
      position: (Algorythmo::Lead.where(stage: stage).maximum(:position) || 0.0) + 1.0,
      stage_entered_at: entered_at
    )
    Algorythmo::StageHistory.create!(
      lead: lead, from_stage: nil, to_stage: stage,
      actor_type: 'system', actor_id: nil, created_at: entered_at
    )
    lead
  end

  # Synthesises a transition row that landed `lead` in `to_stage` at `at`.
  # The lead's stage_entered_at + stage are updated to reflect the move.
  def record_move(lead, from:, to:, at:)
    Algorythmo::StageHistory.create!(
      lead: lead, from_stage: from, to_stage: to,
      actor_type: 'system', actor_id: nil, created_at: at
    )
    lead.update_columns(
      stage_id: to.id,
      stage_kind: to.kind_before_type_cast,
      stage_entered_at: at,
      closed_at: (to.kind == 'won' || to.kind == 'lost') ? at : nil
    )
  end

  subject(:service) { described_class.new(account: account, pipeline: pipeline) }

  describe '#call payload shape' do
    it 'returns the full envelope with all top-level keys' do
      payload = service.call
      expect(payload).to include(:pipeline_id, :computed_at, :ttl_seconds, :summary, :stages)
      expect(payload[:pipeline_id]).to eq(pipeline.id)
      expect(payload[:ttl_seconds]).to eq(60)
      expect(payload[:computed_at]).to match(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    end

    it 'returns one stage entry per pipeline stage, in position order' do
      payload = service.call
      expect(payload[:stages].size).to eq(5)
      expect(payload[:stages].map { |s| s[:stage_id] }).to eq(pipeline.stages.order(:position).map(&:id))
      payload[:stages].each do |s|
        expect(s).to include(:stage_id, :stage_kind, :lead_count, :avg_time_in_stage_seconds, :conversion_rate_to_next)
      end
    end
  end

  describe 'fail-closed — empty account' do
    it 'returns a fully-shaped zero payload when no leads or histories exist' do
      payload = service.call

      expect(payload[:summary]).to eq(open_leads: 0, avg_funnel_hours: 0, conversion_rate: 0)
      payload[:stages].each do |stage_payload|
        expect(stage_payload[:lead_count]).to eq(0)
        expect(stage_payload[:avg_time_in_stage_seconds]).to eq(0)
      end
    end

    it 'returns nil conversion_rate_to_next on terminal stages (won/lost)' do
      payload = service.call
      won_payload  = payload[:stages].find { |s| s[:stage_kind] == 'won' }
      lost_payload = payload[:stages].find { |s| s[:stage_kind] == 'lost' }
      expect(won_payload[:conversion_rate_to_next]).to be_nil
      expect(lost_payload[:conversion_rate_to_next]).to be_nil
    end
  end

  describe 'per-stage metrics' do
    it 'lead_count reflects only active leads currently in each stage' do
      create_lead(stage: novo)
      create_lead(stage: novo)
      create_lead(stage: qual)
      soft_deleted = create_lead(stage: qual)
      soft_deleted.update!(deleted: true)

      payload = service.call
      novo_payload = payload[:stages].find { |s| s[:stage_id] == novo.id }
      qual_payload = payload[:stages].find { |s| s[:stage_id] == qual.id }
      expect(novo_payload[:lead_count]).to eq(2)
      expect(qual_payload[:lead_count]).to eq(1)
    end

    it 'avg_time_in_stage_seconds averages closed stays in the window plus open stays' do
      # Lead A entered Novo 4h ago and moved to Qualificado 1h ago: 3h stay in Novo (closed).
      # Lead B is still in Novo since 2h ago: 2h open stay.
      # Avg in Novo = (3h + 2h) / 2 = 2.5h = 9000s.
      now = Time.current
      lead_a = create_lead(stage: novo, entered_at: now - 4.hours)
      record_move(lead_a, from: novo, to: qual, at: now - 1.hour)
      create_lead(stage: novo, entered_at: now - 2.hours)

      payload = service.call
      novo_payload = payload[:stages].find { |s| s[:stage_id] == novo.id }
      expect(novo_payload[:avg_time_in_stage_seconds]).to be_within(60).of(9000)
    end

    it 'conversion_rate_to_next counts only the next-position stage' do
      # 3 leads left Novo in the window:
      #   - lead1 → Qualificado (position +1) → counts toward conversion.
      #   - lead2 → Qualificado → counts.
      #   - lead3 → Proposta (skipping Qualificado, position +2) → does NOT count.
      now = Time.current
      lead1 = create_lead(stage: novo, entered_at: now - 5.hours)
      record_move(lead1, from: novo, to: qual, at: now - 1.hour)
      lead2 = create_lead(stage: novo, entered_at: now - 5.hours)
      record_move(lead2, from: novo, to: qual, at: now - 1.hour)
      lead3 = create_lead(stage: novo, entered_at: now - 5.hours)
      # Bypass the move guard intentionally — we're seeding history directly.
      Algorythmo::StageHistory.create!(
        lead: lead3, from_stage: novo, to_stage: proposta,
        actor_type: 'system', actor_id: nil, created_at: now - 1.hour
      )
      lead3.update_columns(
        stage_id: proposta.id, stage_kind: proposta.kind_before_type_cast,
        stage_entered_at: now - 1.hour
      )

      payload = service.call
      novo_payload = payload[:stages].find { |s| s[:stage_id] == novo.id }
      expect(novo_payload[:conversion_rate_to_next]).to eq(0.6667)
    end

    it 'returns nil conversion_rate_to_next when no lead exited the stage in the window' do
      create_lead(stage: novo)
      payload = service.call
      novo_payload = payload[:stages].find { |s| s[:stage_id] == novo.id }
      expect(novo_payload[:conversion_rate_to_next]).to be_nil
    end
  end

  describe '90-day window' do
    it 'excludes closed stays that ended more than 90 days ago' do
      now = Time.current
      old = create_lead(stage: novo, entered_at: now - 200.days)
      # Moved out of Novo 100 days ago — outside the 90-day window.
      record_move(old, from: novo, to: qual, at: now - 100.days)

      payload = service.call
      novo_payload = payload[:stages].find { |s| s[:stage_id] == novo.id }
      # The lead is now in Qualificado (open stay since 100 days ago) so qual still
      # has a contribution, but Novo's stay should be excluded.
      expect(novo_payload[:avg_time_in_stage_seconds]).to eq(0)
      expect(novo_payload[:conversion_rate_to_next]).to be_nil
    end

    it 'excludes won/lost leads closed more than 90 days ago from summary aggregates' do
      now = Time.current
      old_won = create_lead(stage: novo, entered_at: now - 200.days)
      record_move(old_won, from: novo, to: won, at: now - 100.days)

      payload = service.call
      expect(payload[:summary][:avg_funnel_hours]).to eq(0)
      expect(payload[:summary][:conversion_rate]).to eq(0)
    end
  end

  describe 'funnel summary' do
    it 'counts open leads, won/lost in the window, and computes conversion_rate' do
      now = Time.current
      # 2 open leads (currently in Novo / Qualificado).
      create_lead(stage: novo)
      create_lead(stage: qual)

      # 3 won in the window, 1 lost in the window.
      3.times do
        l = create_lead(stage: novo, entered_at: now - 10.days)
        record_move(l, from: novo, to: won, at: now - 1.day)
      end
      lost_lead = create_lead(stage: novo, entered_at: now - 10.days)
      record_move(lost_lead, from: novo, to: lost, at: now - 2.days)

      payload = service.call
      expect(payload[:summary][:open_leads]).to eq(2)
      expect(payload[:summary][:conversion_rate]).to eq(0.75)
      expect(payload[:summary][:avg_funnel_hours]).to be > 0
    end
  end

  describe 'cache' do
    around do |example|
      original_cache = Rails.cache
      allow(Rails).to receive(:cache).and_return(ActiveSupport::Cache::MemoryStore.new)
      example.run
      allow(Rails).to receive(:cache).and_return(original_cache)
    end

    it 'computes only once within the cache window' do
      create_lead(stage: novo)
      service_double = described_class.new(account: account, pipeline: pipeline)

      expect(service_double).to receive(:compute).once.and_call_original
      first = service_double.call
      second = service_double.call

      expect(second).to eq(first)
    end

    it 'isolates cache entries between accounts' do
      other_account = create(:account)
      other_pipeline = Algorythmo::Pipeline.create!(account: other_account, name: 'Other')
      Algorythmo::Stage.create!(pipeline: other_pipeline, name: 'X', kind: :open, position: 0, aging_coefficient: 1.0)

      a_payload = described_class.new(account: account, pipeline: pipeline).call
      b_payload = described_class.new(account: other_account, pipeline: other_pipeline).call

      expect(a_payload[:pipeline_id]).to eq(pipeline.id)
      expect(b_payload[:pipeline_id]).to eq(other_pipeline.id)
    end

    # The cache key is versioned by MAX(stage_histories.created_at) for the
    # (account, pipeline) tuple. Without this guarantee, a drag-and-drop in
    # the UI would not surface in the metrics chip until the 60s TTL elapsed.
    it 'busts the cache when a new stage_history row lands in this pipeline' do
      lead = create_lead(stage: novo, entered_at: Time.current - 5.days)
      svc = described_class.new(account: account, pipeline: pipeline)

      first = svc.call
      expect(first[:stages].find { |s| s[:stage_id] == novo.id }[:lead_count]).to eq(1)

      # Sleep a beat so the new history row has a strictly greater created_at
      # than the previous max (the lead's creation row).
      record_move(lead, from: novo, to: qual, at: Time.current)

      second = svc.call
      expect(second[:stages].find { |s| s[:stage_id] == novo.id }[:lead_count]).to eq(0)
      expect(second[:stages].find { |s| s[:stage_id] == qual.id }[:lead_count]).to eq(1)
    end
  end

  describe 'history load bounding (H2)' do
    it 'drops open stays whose entered_at is older than one full window' do
      now = Time.current
      # Lead has been sitting in Qualificado for 200 days. Without bounding,
      # this would push the per-stage avg into multi-month territory and bury
      # the recent signal. The bounded loader excludes the creation row, so
      # the stay disappears from the average.
      create_lead(stage: qual, entered_at: now - 200.days)

      # A fresh lead in the same stage with a 2-day open stay.
      create_lead(stage: qual, entered_at: now - 2.days)

      qual_payload = service.call[:stages].find { |s| s[:stage_id] == qual.id }
      # Without bounding, avg would be ~(200 + 2) / 2 ≈ 101 days. Bounded, only
      # the 2-day stay survives — exactly two days of seconds, give or take a
      # second from rounding.
      expect(qual_payload[:avg_time_in_stage_seconds]).to be_within(60).of(2.days.to_i)
    end
  end
end
