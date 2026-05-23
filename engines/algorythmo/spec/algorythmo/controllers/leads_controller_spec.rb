# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Api::V1::LeadsController, type: :controller do
  routes { Algorythmo::Engine.routes }

  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }
  let(:agent)   { create(:user, account: account, role: :agent) }
  let(:contact) { create(:contact, account: account) }

  # Keep backward compat: existing specs used `user` as admin
  let(:user) { admin }

  let(:pipeline) do
    p = Algorythmo::Pipeline.create!(account: account, name: 'Main')
    Algorythmo::Stage.create!(pipeline: p, name: 'Novo',           kind: :open, position: 0, aging_coefficient: 1.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Qualificado',    kind: :open, position: 1, aging_coefficient: 4.0)
    Algorythmo::Stage.create!(pipeline: p, name: 'Fechado ganho',  kind: :won,  position: 2, aging_coefficient: 0.0)
    p.reload
  end

  let(:novo_stage) { pipeline.stages.find_by(kind: :open, position: 0) }
  let(:qual_stage) { pipeline.stages.find_by(kind: :open, position: 1) }
  let(:won_stage)  { pipeline.stages.find_by(kind: :won) }

  before do
    allow(Algorythmo::FeatureGate).to receive(:feature_enabled?)
                                        .with(account, 'algorythmo_crm')
                                        .and_return(true)
    request.headers['api_access_token'] = user.access_token.token
    pipeline
  end

  def create_lead(stage: nil, pos: 1.0)
    Algorythmo::Lead.create!(
      account: account,
      contact: contact,
      stage: stage || novo_stage,
      position: pos,
      stage_entered_at: Time.current
    )
  end

  # ── GET #index ───────────────────────────────────────────────────────────────

  describe 'GET #index' do
    it 'returns leads for the stage' do
      lead = create_lead
      get :index, params: { account_id: account.id, stage_id: novo_stage.id }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body['leads'].map { |l| l['id'] }).to include(lead.id)
    end

    it 'excludes soft-deleted leads' do
      deleted_lead = create_lead
      deleted_lead.update!(deleted: true)
      get :index, params: { account_id: account.id, stage_id: novo_stage.id }
      body = JSON.parse(response.body)
      expect(body['leads'].map { |l| l['id'] }).not_to include(deleted_lead.id)
    end

    describe 'A.11 — cursor pagination' do
      it 'returns next_cursor when there are more results' do
        # Create 3 leads, request limit=2
        3.times { |i| create_lead(pos: i.to_f + 1) }
        get :index, params: { account_id: account.id, stage_id: novo_stage.id, limit: 2 }
        body = JSON.parse(response.body)
        expect(body['next_cursor']).not_to be_nil
      end

      it 'returns null next_cursor on last page' do
        create_lead(pos: 1.0)
        get :index, params: { account_id: account.id, stage_id: novo_stage.id, limit: 50 }
        body = JSON.parse(response.body)
        expect(body['next_cursor']).to be_nil
      end

      it 'paginates correctly with cursor' do
        5.times { |i| create_lead(pos: i.to_f + 1) }
        get :index, params: { account_id: account.id, stage_id: novo_stage.id, limit: 3 }
        body1 = JSON.parse(response.body)
        cursor = body1['next_cursor']
        expect(cursor).not_to be_nil

        get :index, params: { account_id: account.id, stage_id: novo_stage.id, limit: 3, cursor: cursor }
        body2 = JSON.parse(response.body)
        ids_page1 = body1['leads'].map { |l| l['id'] }
        ids_page2 = body2['leads'].map { |l| l['id'] }
        expect((ids_page1 & ids_page2)).to be_empty
        expect(ids_page2).not_to be_empty
      end

      # B2 — Malformed lead cursor must degrade to first page, never 500.
      describe 'B2 — malformed lead cursor degrades to first page' do
        before { 3.times { |i| create_lead(pos: i.to_f + 1) } }

        it 'returns 200 first page for invalid base64' do
          get :index, params: { account_id: account.id, stage_id: novo_stage.id, cursor: 'not-valid!!!' }
          expect(response).to have_http_status(:ok)
          expect(JSON.parse(response.body)['leads'].size).to eq(3)
        end

        it 'returns 200 first page for valid base64 with bad JSON' do
          bad = Base64.urlsafe_encode64('{"broken":')
          get :index, params: { account_id: account.id, stage_id: novo_stage.id, cursor: bad }
          expect(response).to have_http_status(:ok)
          expect(JSON.parse(response.body)['leads'].size).to eq(3)
        end

        it 'returns 200 first page when array has wrong element count' do
          bad = Base64.urlsafe_encode64('[1, 2, 3, 4]')
          get :index, params: { account_id: account.id, stage_id: novo_stage.id, cursor: bad }
          expect(response).to have_http_status(:ok)
          expect(JSON.parse(response.body)['leads'].size).to eq(3)
        end

        it 'returns 200 first page when id element is not an integer' do
          bad = Base64.urlsafe_encode64('[1.5, "not-an-id"]')
          get :index, params: { account_id: account.id, stage_id: novo_stage.id, cursor: bad }
          expect(response).to have_http_status(:ok)
          expect(JSON.parse(response.body)['leads'].size).to eq(3)
        end

        # HIGH-R2-1 — TypeError class: null/wrong-type elements must not reach Float()/Integer()
        it 'returns first page (not 500) on cursor with null elements' do
          bad = Base64.urlsafe_encode64('[null, null]')
          get :index, params: { account_id: account.id, stage_id: novo_stage.id, cursor: bad }
          expect(response).to have_http_status(:ok)
        end

        it 'returns first page (not 500) on cursor with string where Numeric expected' do
          bad = Base64.urlsafe_encode64('["abc", 1]')
          get :index, params: { account_id: account.id, stage_id: novo_stage.id, cursor: bad }
          expect(response).to have_http_status(:ok)
        end

        it 'returns first page (not 500) on cursor with object elements' do
          bad = Base64.urlsafe_encode64('[{}, []]')
          get :index, params: { account_id: account.id, stage_id: novo_stage.id, cursor: bad }
          expect(response).to have_http_status(:ok)
        end

        it 'returns first page (not 500) on cursor with bigint overflow id' do
          bad = Base64.urlsafe_encode64('[1.5, 99999999999999999999]')
          get :index, params: { account_id: account.id, stage_id: novo_stage.id, cursor: bad }
          expect(response).to have_http_status(:ok)
        end
      end
    end

    # H1 — Preloading contact avatar_attachment prevents N+1 on avatar_url.
    # Threshold chosen so it catches the regression: without `avatar_attachment: :blob`
    # in the includes, each of the 5 contacts fires 2 extra queries (attachment + blob)
    # = 10 extra queries beyond the baseline ~5, totalling ~15+. The cap of 14 forces
    # failure when the preload is absent and passes when it is present.
    describe 'H1 — N+1 prevention for contact avatar' do
      it 'preloads contact avatar to avoid N+1 on index_by_stage' do
        contacts = create_list(:contact, 5, account: account)
        contacts.each do |c|
          c.avatar.attach(
            io: StringIO.new('fakeimage'),
            filename: 'avatar.png',
            content_type: 'image/png'
          )
        end
        contacts.each_with_index do |c, i|
          Algorythmo::Lead.create!(account: account, contact: c, stage: novo_stage,
                                   position: i.to_f + 1, stage_entered_at: Time.current)
        end

        query_count = 0
        counter = ->(*, **) { query_count += 1 }
        ActiveSupport::Notifications.subscribed(counter, 'sql.active_record') do
          get :index, params: { account_id: account.id, stage_id: novo_stage.id }
        end
        expect(response).to have_http_status(:ok)
        # Baseline with preload: ~5-8 queries (auth, leads, contacts, attachments, blobs in bulk).
        # Without `avatar_attachment: :blob` in includes, each of 5 contacts fires 2 extra queries
        # (load attachment record + load blob record) = 10 extra, pushing total above 14.
        # This threshold fails without the preload and passes with it.
        expect(query_count).to be < 14
      end
    end
  end

  # ── GET #show ────────────────────────────────────────────────────────────────

  describe 'GET #show' do
    it 'returns the lead' do
      lead = create_lead
      get :show, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)['id']).to eq(lead.id)
    end

    it 'returns 404 for deleted lead' do
      lead = create_lead
      lead.update!(deleted: true)
      get :show, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:not_found)
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 when accessing a lead from another account' do
        get :show, params: { account_id: account.id, id: lead_b.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── POST #create ─────────────────────────────────────────────────────────────

  describe 'POST #create' do
    # HIGH-NEW #1 — concurrent POST race: partial unique index fires RecordNotUnique
    context 'duplicate open lead (same contact)' do
      it 'returns 409 conflict and does not create a second lead' do
        # First lead — open for contact in account
        Algorythmo::Lead.create!(
          account: account,
          contact: contact,
          stage: novo_stage,
          position: 1.0,
          stage_entered_at: Time.current
        )

        expect {
          post :create, params: {
            account_id: account.id,
            lead: { contact_id: contact.id, stage_id: novo_stage.id }
          }
        }.not_to change(Algorythmo::Lead, :count)

        expect(response).to have_http_status(:conflict)
        expect(JSON.parse(response.body)['error']).to eq('Open lead already exists for this contact')
      end
    end

    context 'cross-account isolation' do
      let(:account_b)  { create(:account) }
      let(:contact_b)  { create(:contact, account: account_b) }

      it 'returns 404 and does not create a lead when contact_id belongs to another account' do
        expect {
          post :create, params: {
            account_id: account.id,
            lead: { contact_id: contact_b.id, stage_id: novo_stage.id }
          }
        }.not_to change(Algorythmo::Lead, :count)

        expect(response).to have_http_status(:not_found)
      end

      it 'returns 404 when previous_lead_id belongs to another account' do
        pipeline_b = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        stage_b    = Algorythmo::Stage.create!(pipeline: pipeline_b, name: 'Novo', kind: :open,
                                               position: 0, aging_coefficient: 1.0)
        lead_b     = Algorythmo::Lead.create!(account: account_b, contact: contact_b,
                                              stage: stage_b, position: 1.0, stage_entered_at: Time.current)

        post :create, params: {
          account_id: account.id,
          lead: { contact_id: contact.id, stage_id: novo_stage.id, previous_lead_id: lead_b.id }
        }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── PATCH #update ─────────────────────────────────────────────────────────────

  describe 'PATCH #update' do
    # HIGH-NEW #2 — :deleted removed from strong params; PATCH must never soft-delete
    context 'soft-delete backdoor prevention' do
      let(:lead) { create_lead }

      it 'agent PATCH with deleted:true returns 200 but does not change deleted flag' do
        request.headers['api_access_token'] = agent.access_token.token
        patch :update, params: { account_id: account.id, id: lead.id, lead: { deleted: true } }
        expect(response).to have_http_status(:ok)
        expect(lead.reload.deleted).to be false
      end

      it 'admin PATCH with deleted:true also does not change deleted flag (use DELETE instead)' do
        patch :update, params: { account_id: account.id, id: lead.id, lead: { deleted: true } }
        expect(response).to have_http_status(:ok)
        expect(lead.reload.deleted).to be false
      end
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 and does not mutate the lead when updating a lead from another account' do
        original_channel = lead_b.channel_origin
        patch :update, params: { account_id: account.id, id: lead_b.id, lead: { channel_origin: 'api' } }
        expect(response).to have_http_status(:not_found)
        expect(lead_b.reload.channel_origin).to eq(original_channel)
      end
    end
  end

  # ── PATCH #move ───────────────────────────────────────────────────────────────

  describe 'PATCH #move' do
    it 'moves lead to a new stage' do
      lead = create_lead
      patch :move, params: { account_id: account.id, id: lead.id, stage_id: qual_stage.id }
      expect(response).to have_http_status(:ok)
      expect(lead.reload.stage_id).to eq(qual_stage.id)
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 when moving a lead from another account' do
        patch :move, params: { account_id: account.id, id: lead_b.id, stage_id: novo_stage.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── POST #reopen ──────────────────────────────────────────────────────────────

  describe 'POST #reopen' do
    it 'creates a new lead with previous_lead_id' do
      lead = create_lead(stage: won_stage)
      post :reopen, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body['previous_lead_id']).to eq(lead.id)
    end

    it 'returns 422 when lead is already open' do
      lead = create_lead
      post :reopen, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:unprocessable_entity)
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Won', kind: :won, position: 0, aging_coefficient: 0.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 when reopening a lead from another account' do
        post :reopen, params: { account_id: account.id, id: lead_b.id }
        expect(response).to have_http_status(:not_found)
      end
    end
  end

  # ── DELETE #destroy ───────────────────────────────────────────────────────────

  describe 'DELETE #destroy' do
    it 'soft-deletes the lead (admin)' do
      lead = create_lead
      delete :destroy, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:no_content)
      expect(lead.reload.deleted).to be true
    end

    context 'H2 — role enforcement' do
      before { request.headers['api_access_token'] = agent.access_token.token }

      it 'returns 401/403 when an agent attempts to delete a lead' do
        lead = create_lead
        delete :destroy, params: { account_id: account.id, id: lead.id }
        expect(response).to have_http_status(:unauthorized).or have_http_status(:forbidden)
      end
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 and does not soft-delete the lead when deleting across accounts' do
        delete :destroy, params: { account_id: account.id, id: lead_b.id }
        expect(response).to have_http_status(:not_found)
        # MED-NEW #3: DB assertion — lead_b must remain untouched
        expect(lead_b.reload.deleted).to be false
      end
    end
  end

  # ── Feature gate ─────────────────────────────────────────────────────────────

  describe 'feature gate enforcement' do
    it 'returns 403 when algorythmo_crm is disabled' do
      allow(Algorythmo::FeatureGate).to receive(:feature_enabled?).and_return(false)
      get :index, params: { account_id: account.id, stage_id: novo_stage.id }
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ── B.0 — GET #index with contact_id filter ───────────────────────────────────

  describe 'GET #index with contact_id filter' do
    it 'returns open leads for the contact' do
      lead = create_lead
      get :index, params: { account_id: account.id, contact_id: contact.id }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body['leads'].map { |l| l['id'] }).to include(lead.id)
    end

    it 'returns next_cursor as nil (no pagination on contact filter)' do
      create_lead
      get :index, params: { account_id: account.id, contact_id: contact.id }
      body = JSON.parse(response.body)
      expect(body['next_cursor']).to be_nil
    end

    # H2 — index_by_contact must return only open leads (plan §5 B.0).
    describe 'H2 — open-only filtering' do
      it 'returns only the open lead when contact has open + won + lost leads' do
        open_lead = create_lead(stage: novo_stage)
        won_lead  = create_lead(stage: won_stage, pos: 2.0)
        # Create a lost stage and a lost lead
        pipeline.reload
        lost_stage = Algorythmo::Stage.create!(pipeline: pipeline, name: 'Perdido', kind: :lost,
                                               position: 3, aging_coefficient: 0.0)
        lost_lead = Algorythmo::Lead.create!(account: account, contact: contact, stage: lost_stage,
                                             position: 1.0, stage_entered_at: Time.current)

        get :index, params: { account_id: account.id, contact_id: contact.id }
        expect(response).to have_http_status(:ok)
        ids = JSON.parse(response.body)['leads'].map { |l| l['id'] }
        expect(ids).to include(open_lead.id)
        expect(ids).not_to include(won_lead.id, lost_lead.id)
      end

      it 'returns empty leads array when contact has no open leads' do
        won_lead = create_lead(stage: won_stage, pos: 1.0)

        get :index, params: { account_id: account.id, contact_id: contact.id }
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body['leads']).to be_empty
      end
    end

    context 'IDOR — contact belongs to another account' do
      let(:account_b)  { create(:account) }
      let(:contact_b)  { create(:contact, account: account_b) }

      it 'returns 404 and does not leak leads from another account' do
        get :index, params: { account_id: account.id, contact_id: contact_b.id }
        expect(response).to have_http_status(:not_found)
      end
    end

    it 'returns 400 when neither stage_id nor contact_id is supplied' do
      get :index, params: { account_id: account.id }
      expect(response).to have_http_status(:bad_request)
      expect(JSON.parse(response.body)['error']).to eq('stage_id or contact_id is required')
    end
  end

  # ── B.0 — contact embed in lead_json ─────────────────────────────────────────

  describe 'contact embed in lead_json' do
    it 'includes contact block with expected keys in #show response' do
      lead = create_lead
      get :show, params: { account_id: account.id, id: lead.id }
      body = JSON.parse(response.body)
      expect(body).to have_key('contact')
      expect(body['contact'].keys).to include('id', 'name', 'email', 'phone_number', 'thumbnail')
    end

    it 'includes contact id matching the lead contact' do
      lead = create_lead
      get :show, params: { account_id: account.id, id: lead.id }
      body = JSON.parse(response.body)
      expect(body['contact']['id']).to eq(contact.id)
    end

    it 'returns contact in index response leads' do
      create_lead
      get :index, params: { account_id: account.id, stage_id: novo_stage.id }
      body = JSON.parse(response.body)
      expect(body['leads'].first).to have_key('contact')
    end
  end

  # ── B.0 — GET #conversations ──────────────────────────────────────────────────

  describe 'GET #conversations' do
    let(:inbox)  { create(:inbox, account: account) }
    let(:lead)   { create_lead }

    def create_conversation(created_offset_seconds: 0)
      Conversation.create!(
        account: account,
        inbox: inbox,
        contact: contact,
        contact_inbox: ContactInbox.find_or_create_by!(contact: contact, inbox: inbox),
        created_at: Time.current - created_offset_seconds.seconds
      )
    end

    it 'returns conversations for the lead contact, newest first' do
      older = create_conversation(created_offset_seconds: 60)
      newer = create_conversation(created_offset_seconds: 0)
      get :conversations, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      ids = body['conversations'].map { |c| c['id'] }
      expect(ids.first).to eq(newer.id)
      expect(ids).to include(older.id)
    end

    it 'includes required conversation fields' do
      create_conversation
      get :conversations, params: { account_id: account.id, id: lead.id }
      conv = JSON.parse(response.body)['conversations'].first
      expect(conv.keys).to include('id', 'display_id', 'status', 'inbox_id',
                                   'last_activity_at', 'created_at')
    end

    it 'defaults to limit 10 when limit param is absent' do
      12.times { |i| create_conversation(created_offset_seconds: i) }
      get :conversations, params: { account_id: account.id, id: lead.id }
      body = JSON.parse(response.body)
      expect(body['conversations'].size).to eq(10)
      expect(body['next_cursor']).not_to be_nil
    end

    # M1 — Spec must actually verify the cap by creating enough rows and checking size + next_cursor.
    it 'caps limit at 100 when a higher value is requested' do
      105.times { |i| create_conversation(created_offset_seconds: i) }
      get :conversations, params: { account_id: account.id, id: lead.id, limit: 200 }
      body = JSON.parse(response.body)
      expect(response).to have_http_status(:ok)
      expect(body['conversations'].size).to eq(100)
      expect(body['next_cursor']).not_to be_nil
    end

    # M5 — 404 for soft-deleted lead.
    it 'returns 404 for soft-deleted lead' do
      lead.update!(deleted: true)
      get :conversations, params: { account_id: account.id, id: lead.id }
      expect(response).to have_http_status(:not_found)
    end

    # B2 — Malformed cursor must not raise 500; must silently return first page.
    describe 'B2 — malformed conversation cursor degrades to first page' do
      before { 3.times { |i| create_conversation(created_offset_seconds: i) } }

      it 'returns 200 first page for invalid base64' do
        get :conversations, params: { account_id: account.id, id: lead.id, cursor: 'invalid-base64!!!' }
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['conversations'].size).to eq(3)
      end

      it 'returns 200 first page for valid base64 but bad JSON' do
        bad_cursor = Base64.urlsafe_encode64('{"bad":"json"')
        get :conversations, params: { account_id: account.id, id: lead.id, cursor: bad_cursor }
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['conversations'].size).to eq(3)
      end

      it 'returns 200 first page when timestamp field is not ISO8601' do
        bad_cursor = Base64.urlsafe_encode64('["not-a-timestamp", 1]')
        get :conversations, params: { account_id: account.id, id: lead.id, cursor: bad_cursor }
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['conversations'].size).to eq(3)
      end

      it 'returns 200 first page when array has wrong element count' do
        bad_cursor = Base64.urlsafe_encode64('[1, 2, 3, 4]')
        get :conversations, params: { account_id: account.id, id: lead.id, cursor: bad_cursor }
        expect(response).to have_http_status(:ok)
        expect(JSON.parse(response.body)['conversations'].size).to eq(3)
      end

      # HIGH-R2-1 — TypeError class: null/wrong-type elements must not reach Time.iso8601()/Integer()
      it 'returns first page (not 500) on cursor with null elements' do
        bad_cursor = Base64.urlsafe_encode64('[null, null]')
        get :conversations, params: { account_id: account.id, id: lead.id, cursor: bad_cursor }
        expect(response).to have_http_status(:ok)
      end

      it 'returns first page (not 500) on cursor with wrong-type timestamp element' do
        bad_cursor = Base64.urlsafe_encode64('[42, 1]')
        get :conversations, params: { account_id: account.id, id: lead.id, cursor: bad_cursor }
        expect(response).to have_http_status(:ok)
      end

      it 'returns first page (not 500) on cursor with object elements' do
        bad_cursor = Base64.urlsafe_encode64('[{}, []]')
        get :conversations, params: { account_id: account.id, id: lead.id, cursor: bad_cursor }
        expect(response).to have_http_status(:ok)
      end

      it 'returns first page (not 500) on cursor with bigint overflow id' do
        bad_cursor = Base64.urlsafe_encode64('["2026-01-01T00:00:00Z", 99999999999999999999]')
        get :conversations, params: { account_id: account.id, id: lead.id, cursor: bad_cursor }
        expect(response).to have_http_status(:ok)
      end
    end

    describe 'cursor pagination' do
      it 'returns next_cursor when there are more results' do
        12.times { |i| create_conversation(created_offset_seconds: i) }
        get :conversations, params: { account_id: account.id, id: lead.id, limit: 10 }
        body = JSON.parse(response.body)
        expect(body['next_cursor']).not_to be_nil
      end

      it 'returns the next page using cursor, with no overlap' do
        12.times { |i| create_conversation(created_offset_seconds: i) }
        get :conversations, params: { account_id: account.id, id: lead.id, limit: 10 }
        body1 = JSON.parse(response.body)
        cursor = body1['next_cursor']

        get :conversations, params: { account_id: account.id, id: lead.id, limit: 10, cursor: cursor }
        body2 = JSON.parse(response.body)

        ids1 = body1['conversations'].map { |c| c['id'] }
        ids2 = body2['conversations'].map { |c| c['id'] }
        expect((ids1 & ids2)).to be_empty
        expect(ids2).not_to be_empty
      end

      it 'returns null next_cursor on the last page' do
        2.times { |i| create_conversation(created_offset_seconds: i) }
        get :conversations, params: { account_id: account.id, id: lead.id, limit: 10 }
        body = JSON.parse(response.body)
        expect(body['next_cursor']).to be_nil
      end
    end

    # B1 — Horizontal privilege escalation via inbox membership.
    describe 'B1 — inbox-scoped access control' do
      let(:inbox_x)  { create(:inbox, account: account) }
      let(:inbox_y)  { create(:inbox, account: account) }
      let(:member_agent) { create(:user, account: account, role: :agent) }

      def create_conversation_in_inbox(inbox_obj, offset: 0)
        ci = ContactInbox.find_or_create_by!(contact: contact, inbox: inbox_obj)
        Conversation.create!(
          account: account,
          inbox: inbox_obj,
          contact: contact,
          contact_inbox: ci,
          created_at: Time.current - offset.seconds
        )
      end

      it 'admin sees all conversations regardless of inbox membership' do
        conv_x = create_conversation_in_inbox(inbox_x)
        conv_y = create_conversation_in_inbox(inbox_y)
        # admin (user) has no inbox memberships but is administrator
        get :conversations, params: { account_id: account.id, id: lead.id }
        expect(response).to have_http_status(:ok)
        ids = JSON.parse(response.body)['conversations'].map { |c| c['id'] }
        expect(ids).to include(conv_x.id, conv_y.id)
      end

      it 'agent member of inbox_x sees only conversations from inbox_x' do
        InboxMember.create!(inbox: inbox_x, user: member_agent)
        conv_x = create_conversation_in_inbox(inbox_x)
        _conv_y = create_conversation_in_inbox(inbox_y)

        request.headers['api_access_token'] = member_agent.access_token.token
        get :conversations, params: { account_id: account.id, id: lead.id }
        expect(response).to have_http_status(:ok)
        ids = JSON.parse(response.body)['conversations'].map { |c| c['id'] }
        expect(ids).to include(conv_x.id)
        expect(ids).not_to include(_conv_y.id)
      end

      it 'agent with no inbox membership sees empty conversations list' do
        create_conversation_in_inbox(inbox_x)
        create_conversation_in_inbox(inbox_y)
        # member_agent belongs to no inbox

        request.headers['api_access_token'] = member_agent.access_token.token
        get :conversations, params: { account_id: account.id, id: lead.id }
        expect(response).to have_http_status(:ok)
        body = JSON.parse(response.body)
        expect(body['conversations']).to be_empty
      end

      it 'admin with no inbox memberships still sees all conversations' do
        admin_no_inbox = create(:user, account: account, role: :administrator)
        conv_x = create_conversation_in_inbox(inbox_x)
        conv_y = create_conversation_in_inbox(inbox_y)

        request.headers['api_access_token'] = admin_no_inbox.access_token.token
        get :conversations, params: { account_id: account.id, id: lead.id }
        expect(response).to have_http_status(:ok)
        ids = JSON.parse(response.body)['conversations'].map { |c| c['id'] }
        expect(ids).to include(conv_x.id, conv_y.id)
      end
    end

    context 'cross-account isolation' do
      let(:account_b) { create(:account) }
      let(:pipeline_b) do
        p = Algorythmo::Pipeline.create!(account: account_b, name: 'B Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p.reload
      end
      let(:stage_b)   { pipeline_b.stages.first }
      let(:contact_b) { create(:contact, account: account_b) }
      let(:lead_b) do
        Algorythmo::Lead.create!(account: account_b, contact: contact_b, stage: stage_b,
                                 position: 1.0, stage_entered_at: Time.current)
      end

      before { lead_b }

      it 'returns 404 when requesting conversations for a lead from another account' do
        get :conversations, params: { account_id: account.id, id: lead_b.id }
        expect(response).to have_http_status(:not_found)
      end
    end

    # LOW-R2-1 — Feature gate must be enforced on #conversations the same way as other actions.
    context 'when CRM feature is disabled' do
      before { allow(Algorythmo::FeatureGate).to receive(:feature_enabled?).and_return(false) }

      it 'returns 403' do
        get :conversations, params: { account_id: account.id, id: lead.id }
        expect(response).to have_http_status(:forbidden)
      end
    end
  end
end
