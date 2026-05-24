# frozen_string_literal: true

require 'rails_helper'

# §8.1 — RSpec coverage for CrmListener outgoing-human → owner setter (M1-C PR 1).
# 8 scenarios from the plan §8.1 table plus 1 concurrency scenario (PG-only).
RSpec.describe Algorythmo::CrmListener, type: :listener do
  subject(:listener) { described_class.instance }

  let(:account)  { create(:account) }
  let(:contact)  { create(:contact, account: account) }
  let(:inbox) do
    create(:inbox, account: account, channel: create(:channel_widget, account: account))
  end
  let(:conversation) do
    create(:conversation, account: account, inbox: inbox, contact: contact)
  end
  let(:agent) { create(:user, account: account) }

  let(:pipeline) do
    p = Algorythmo::Pipeline.create!(account: account, name: 'Main')
    Algorythmo::Stage.create!(pipeline: p, name: 'Novo',          kind: :open, position: 0, aging_coefficient: 1.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Fechado ganho', kind: :won,  position: 1, aging_coefficient: 0.0)
    p.reload
  end

  let(:novo_stage) { pipeline.stages.find_by(kind: :open) }
  let(:won_stage)  { pipeline.stages.find_by(kind: :won) }

  let!(:open_lead) do
    pipeline
    Algorythmo::Lead.create!(
      account: account,
      contact: contact,
      stage: novo_stage,
      position: 1.0,
      stage_entered_at: Time.current
    )
  end

  def enable_crm_gate!
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).with(account, 'crm').and_return(true)
  end

  def build_event(message)
    OpenStruct.new(data: { message: message })
  end

  def outgoing_message(sender: agent, conv: conversation)
    create(:message,
           message_type: :outgoing,
           account: account,
           inbox: inbox,
           conversation: conv,
           sender: sender)
  end

  def incoming_message(sender: contact, conv: conversation)
    create(:message,
           message_type: :incoming,
           account: account,
           inbox: inbox,
           conversation: conv,
           sender: sender)
  end

  before { enable_crm_gate! }

  # ── Scenario 1: Outgoing from User, lead open, no owner → sets owner ──────────

  describe 'outgoing message from User with open unowned lead' do
    it 'sets owner_id via atomic update_all' do
      msg = outgoing_message

      expect do
        listener.message_created(build_event(msg))
      end.to change { open_lead.reload.owner_id }.from(nil).to(agent.id)
    end
  end

  # ── Scenario 2: Outgoing from User, lead already has owner → no-op ───────────

  describe 'outgoing message from User with lead that already has an owner' do
    let(:first_agent) { create(:user, account: account) }

    before do
      open_lead.update_columns(owner_id: first_agent.id)
    end

    it 'does not overwrite the existing owner (idempotence via WHERE)' do
      msg = outgoing_message(sender: agent)
      listener.message_created(build_event(msg))
      expect(open_lead.reload.owner_id).to eq(first_agent.id)
    end
  end

  # ── Scenario 3: Outgoing from AgentBot (Manu) → branch never entered ─────────

  describe 'outgoing message from AgentBot' do
    let(:agent_bot) { create(:agent_bot) }

    it 'does not set owner_id (AgentBot is not User)' do
      msg = outgoing_message(sender: agent_bot)
      listener.message_created(build_event(msg))
      expect(open_lead.reload.owner_id).to be_nil
    end

    it 'does not change Lead count' do
      msg = outgoing_message(sender: agent_bot)
      expect { listener.message_created(build_event(msg)) }.not_to change(Algorythmo::Lead, :count)
    end
  end

  # ── Scenario 4: Outgoing from User, no open lead → no-op + debug log ─────────

  describe 'outgoing message from User when no open lead exists for the contact' do
    before do
      open_lead.update_column(:deleted, true)
    end

    it 'does not raise and does not log at warn level (SDR cold-outbound is high-volume)' do
      # Contrato: SDR/cold-outbound bate aqui em volume — nao deve poluir o warn log.
      # Stub apenas warn (debug eh chamado por todo Rails — checar count seria flaky).
      allow(Rails.logger).to receive(:warn)
      msg = outgoing_message

      expect { listener.message_created(build_event(msg)) }.not_to raise_error
      expect(Rails.logger).not_to have_received(:warn)
    end
  end

  # ── Scenario 5: Owner was nullified (user destroyed) → next human re-sets ─────

  describe 'outgoing message from User when previous owner was destroyed (owner_id nullified)' do
    before do
      open_lead.update_columns(owner_id: nil)
    end

    it 'sets owner_id again via atomic UPDATE (WHERE owner_id IS NULL matches)' do
      msg = outgoing_message
      listener.message_created(build_event(msg))
      expect(open_lead.reload.owner_id).to eq(agent.id)
    end
  end

  # ── Scenario 6: Incoming message → incoming branch, owner not touched ─────────

  describe 'incoming message (contact)' do
    it 'does not set owner_id (wrong branch)' do
      msg = incoming_message
      listener.message_created(build_event(msg))
      expect(open_lead.reload.owner_id).to be_nil
    end
  end

  # ── Scenario 7: Flag algorythmo_crm off → no-op ───────────────────────────────

  describe 'when algorythmo_crm flag is disabled' do
    before do
      allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).with(account, 'crm').and_return(false)
    end

    it 'does not set owner_id' do
      msg = outgoing_message
      listener.message_created(build_event(msg))
      expect(open_lead.reload.owner_id).to be_nil
    end
  end

  # ── Scenario 8a: private note (nota interna) → NOT counted as first reply ────
  #
  # Adversarial review PR #51 — Crítico #1.
  # Vendedor escreve "vou passar pro Bruno" como nota interna (private: true).
  # Cliente não vê. Não deve atribuir owner. Filtro: !message.private?

  describe 'outgoing private note (nota interna) from User' do
    it 'does not set owner_id (nota interna não é primeira resposta ao cliente)' do
      msg = create(:message,
                   message_type: :outgoing,
                   account: account,
                   inbox: inbox,
                   conversation: conversation,
                   sender: agent,
                   private: true)

      listener.message_created(build_event(msg))
      expect(open_lead.reload.owner_id).to be_nil
    end
  end

  # ── Scenario 8b: campaign message → NOT counted as first reply ───────────────
  #
  # Adversarial review PR #51 — Crítico #2.
  # Disparo de campanha em massa: sender = User (operador), message_type = outgoing,
  # additional_attributes['campaign_id'] presente. NÃO deve atribuir o operador
  # como owner — ele não atendeu, só puxou o gatilho da blast.
  # Filtro herdado de Message#human_response? (additional_attributes['campaign_id'].blank?).

  describe 'outgoing campaign message from User' do
    it 'does not set owner_id (campanha massiva não é atendimento)' do
      msg = create(:message,
                   message_type: :outgoing,
                   account: account,
                   inbox: inbox,
                   conversation: conversation,
                   sender: agent,
                   additional_attributes: { 'campaign_id' => 42 })

      listener.message_created(build_event(msg))
      expect(open_lead.reload.owner_id).to be_nil
    end
  end

  # ── Scenario 8c: automation rule message → NOT counted as first reply ────────
  #
  # Adversarial review PR #51 — defesa em profundidade.
  # Regras de automação do Chatwoot disparam outgoing messages com
  # content_attributes['automation_rule_id'] presente. Filtro herdado de
  # Message#human_response? (content_attributes['automation_rule_id'].blank?).

  describe 'outgoing automation-rule message from User' do
    it 'does not set owner_id (mensagem disparada por regra de automação)' do
      msg = create(:message,
                   message_type: :outgoing,
                   account: account,
                   inbox: inbox,
                   conversation: conversation,
                   sender: agent,
                   content_attributes: { 'automation_rule_id' => 7 })

      listener.message_created(build_event(msg))
      expect(open_lead.reload.owner_id).to be_nil
    end
  end

  # ── Scenario 8d: sender User is NOT an AccountUser of this account ───────────
  #
  # Adversarial review PR #51 — Crítico #2: cross-account integrity.
  # SuperAdmin / staff / a User mistakenly granted reply rights from another account
  # would otherwise be written into owner_id, leaving a Lead pointing at a non-member.
  # Frontend joins owner against AccountUser → user disappears from /agents → owner
  # avatar 404s, name "Unknown", drawer crashes. Guard: AccountUser.exists?

  describe 'outgoing message from User who is NOT a member of the account' do
    let(:other_account) { create(:account) }
    let(:foreign_user)  { create(:user, account: other_account) } # member of other_account only

    it 'does not set owner_id (membership guard)' do
      msg = create(:message,
                   message_type: :outgoing,
                   account: account,
                   inbox: inbox,
                   conversation: conversation,
                   sender: foreign_user)

      listener.message_created(build_event(msg))
      expect(open_lead.reload.owner_id).to be_nil
    end
  end

  # ── Scenario 8: outgoing from User but conversation has no contact_id ─────────

  describe 'outgoing message from User on conversation with nil contact_id' do
    it 'does not set owner_id (guard on contact_id.present?)' do
      conv_no_contact = create(:conversation, account: account, inbox: inbox)
      conv_no_contact.update_column(:contact_id, nil)

      msg = create(:message,
                   message_type: :outgoing,
                   account: account,
                   inbox: inbox,
                   conversation: conv_no_contact,
                   sender: agent)

      expect { listener.message_created(build_event(msg)) }.not_to raise_error
      expect(open_lead.reload.owner_id).to be_nil
    end
  end

  # ── Concurrency: race between 2 humans → first-writer-wins ───────────────────
  #
  # §8.1 — Verifies update_all WHERE owner_id IS NULL atomicity at the DB level.
  # self.use_transactional_tests = false so that threads commit independently and
  # actually race at the Postgres row level. Skipped on non-PG adapters.
  #
  # Cleanup: after block targets only objects created by this test via account_id
  # scope, avoiding cross-test contamination.

  describe 'concurrency: 10 humans reply simultaneously (race)' do
    self.use_transactional_tests = false

    before do
      skip 'Postgres-only (update_all atomicity)' unless
        ActiveRecord::Base.connection.adapter_name == 'PostgreSQL'
    end

    # Non-transactional cleanup: delete only Algorythmo-owned records committed by this test.
    # Standard Chatwoot records (accounts, contacts, users) are managed by the test suite
    # DB cleanup at suite end. FK-safe order: leads first, then stages, then pipelines.
    after do
      Algorythmo::Lead.where(account_id: account.id).delete_all
      Algorythmo::Stage.joins(:pipeline)
                       .where(algorythmo_pipelines: { account_id: account.id })
                       .delete_all
      Algorythmo::Pipeline.where(account_id: account.id).delete_all
    end

    it 'ensures exactly one thread wins (first-writer-wins by DB)' do
      # Materialize the lead before threads start.
      lead = open_lead
      threads_count = 10
      race_agents = Array.new(threads_count) { create(:user, account: account) }

      results = Array.new(threads_count)

      threads = race_agents.each_with_index.map do |human, idx|
        Thread.new do
          # Default pool size is 5; with 10 threads each holding a connection for the
          # duration of the thread we hit ConnectionTimeoutError. with_connection
          # actively returns the connection on block exit so the next thread can grab it.
          ActiveRecord::Base.connection_pool.with_connection do
            updated = Algorythmo::Lead
                      .where(id: lead.id, owner_id: nil)
                      .update_all(owner_id: human.id, updated_at: Time.current)
            results[idx] = updated
          end
        end
      end

      threads.each(&:join)

      winners = results.count { |r| r == 1 }
      losers  = results.count(&:zero?)

      expect(winners).to eq(1),
                         "Expected exactly 1 winner, got #{winners} (results: #{results.inspect})"
      expect(losers).to eq(threads_count - 1)
      expect(lead.reload.owner_id).not_to be_nil
    end
  end
end
