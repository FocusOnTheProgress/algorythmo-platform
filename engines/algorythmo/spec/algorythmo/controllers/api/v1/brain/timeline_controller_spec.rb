# frozen_string_literal: true

require 'rails_helper'

# Contract for Algorythmo::Api::V1::Brain::TimelineController#index:
#   - Auth fail-closed (non-founder → 403)
#   - Empty brain → 200 + [] (honest empty-state)
#   - Snapshots appear as 'snapshot' events
#   - Ingestion logs appear as 'conversation_ingested' events (page 1 only)
#   - Events sorted newest-first
#   - Shape: { data: [...], meta: { page, per_page, count } }
#   - gbrain is never called (read from DB only)
RSpec.describe Algorythmo::Api::V1::Brain::TimelineController, type: :request do
  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }
  let(:headers) { { 'api_access_token' => admin.access_token.token } }
  let(:inbox)   { create(:inbox, account: account) }

  let(:base_path) { "/algorythmo/api/v1/accounts/#{account.id}/brain/timeline" }

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(true)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(account.id.to_s)
    # Ensure algorythmo_m3_start_date is set so ingestion logs can be created
    account.update_column(:algorythmo_m3_start_date, 60.days.ago)
  end

  # ---------------------------------------------------------------------------
  # 403 fail-closed
  # ---------------------------------------------------------------------------
  context 'when the requesting account does not match ALGORYTHMO_PRIMARY_ACCOUNT_ID' do
    let(:other_account) { create(:account) }

    before do
      allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID')
                                .and_return(other_account.id.to_s)
    end

    it 'returns 403' do
      get base_path, headers: headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  # Empty brain — honest empty-state
  # ---------------------------------------------------------------------------
  context 'when the brain has no history at all' do
    it 'returns 200 with an empty data array' do
      get base_path, headers: headers
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body['data']).to eq([])
    end
  end

  # ---------------------------------------------------------------------------
  # Snapshot events
  # ---------------------------------------------------------------------------
  context 'when the account has snapshots' do
    let!(:snapshot) do
      create(:algorythmo_brain_snapshot,
             account: account,
             taken_at: 1.hour.ago,
             stats: { 'pages' => 5 },
             diff_summary: 'pages: 4→5 (+1)',
             trigger: 'cron')
    end

    it 'returns 200' do
      get base_path, headers: headers
      expect(response).to have_http_status(:ok)
    end

    it 'includes a snapshot event with the correct type and shape' do
      get base_path, headers: headers
      events = JSON.parse(response.body)['data']
      snap_event = events.find { |e| e['type'] == 'snapshot' }

      aggregate_failures do
        expect(snap_event).not_to be_nil
        expect(snap_event['id']).to eq("snapshot-#{snapshot.id}")
        expect(snap_event['summary']).to eq('pages: 4→5 (+1)')
        expect(snap_event['trigger']).to eq('cron')
        expect(snap_event).to have_key('occurred_at')
        expect(snap_event).to have_key('meta')
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Ingestion log events (page 1 only)
  # ---------------------------------------------------------------------------
  context 'when the account has successful ingestion logs' do
    let!(:conversation) do
      create(:conversation,
             account: account,
             inbox: inbox,
             status: 'resolved',
             created_at: 1.day.ago)
    end

    let!(:ingestion_log) do
      Algorythmo::Brain::IngestionLog.create!(
        account_id:      account.id,
        conversation_id: conversation.id,
        outcome:         :success,
        brain_indexed_at: 30.minutes.ago,
        brain_page_path: '/brain/conv/42.md'
      )
    end

    it 'includes a conversation_ingested event' do
      get base_path, headers: headers
      events = JSON.parse(response.body)['data']
      ingest_event = events.find { |e| e['type'] == 'conversation_ingested' }

      expect(ingest_event).not_to be_nil
      expect(ingest_event['id']).to eq("ingestion-#{ingestion_log.id}")
    end

    it 'does not include failed ingestion logs' do
      failed_conv = create(:conversation, account: account, inbox: inbox, status: 'resolved')
      Algorythmo::Brain::IngestionLog.create!(
        account_id:      account.id,
        conversation_id: failed_conv.id,
        outcome:         :failed,
        last_error:      'gbrain exploded'
      )

      get base_path, headers: headers
      events = JSON.parse(response.body)['data']
      ids = events.map { |e| e['id'] }
      expect(ids).not_to include("ingestion-#{Algorythmo::Brain::IngestionLog.find_by(outcome: :failed).id}")
    end

    it 'does not include ingestion events on page 2' do
      get "#{base_path}?page=2", headers: headers
      events = JSON.parse(response.body)['data']
      ingestion_events = events.select { |e| e['type'] == 'conversation_ingested' }
      expect(ingestion_events).to be_empty
    end
  end

  # ---------------------------------------------------------------------------
  # Events sorted newest-first
  # ---------------------------------------------------------------------------
  context 'ordering' do
    let!(:old_snapshot) do
      create(:algorythmo_brain_snapshot,
             account: account,
             taken_at: 3.hours.ago,
             trigger: 'cron')
    end

    let!(:new_snapshot) do
      create(:algorythmo_brain_snapshot,
             account: account,
             taken_at: 1.hour.ago,
             trigger: 'upload')
    end

    it 'returns events newest-first' do
      get base_path, headers: headers
      events = JSON.parse(response.body)['data']
      times = events.map { |e| Time.parse(e['occurred_at']) }
      expect(times).to eq(times.sort.reverse)
    end
  end
end
