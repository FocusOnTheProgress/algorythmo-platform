# frozen_string_literal: true

module Algorythmo
  module Api
    module V1
      # LeadsController — CRUD + move + reopen for Algorythmo::Lead.
      #
      # A.11 — Cursor pagination (P2):
      #   GET index uses a (position, id) cursor — never offset.
      #   Reason: offset pagination on a float position column causes phantom/duplicate
      #   cards when leads are reordered between pages. The composite cursor is stable.
      #   The index (account_id, stage_id, position) ensures this query uses an index scan.
      #
      # Offset pagination is intentionally absent from this controller.
      class LeadsController < BaseController
        before_action :set_lead, only: %i[show update destroy move reopen]
        # algorythmo: admin-only — soft-delete is irreversible via API; agents cannot delete leads
        before_action :check_admin_authorization?, only: %i[destroy]

        DEFAULT_LIMIT = 50
        MAX_LIMIT     = 200

        # GET /algorythmo/api/v1/accounts/:account_id/leads
        # Query params:
        #   stage_id   — required; filters by stage
        #   cursor     — optional; opaque string encoding (position, id) from prev page
        #   limit      — optional; default 50, max 200
        #
        # Response:
        #   { leads: [...], next_cursor: "..." | null }
        def index
          stage_id = params[:stage_id]
          limit    = [[params.fetch(:limit, DEFAULT_LIMIT).to_i, 1].max, MAX_LIMIT].min

          base = Algorythmo::Lead
                 .active
                 .where(account_id: current_account.id, stage_id: stage_id)
                 .includes(:contact, :stage)
                 .order(:position, :id)

          leads = apply_cursor(base, params[:cursor], limit + 1)

          has_more   = leads.size > limit
          page_leads = leads.first(limit)

          render json: {
            leads: page_leads.map { |l| lead_json(l) },
            next_cursor: has_more ? encode_cursor(page_leads.last) : nil
          }
        end

        # GET /algorythmo/api/v1/accounts/:account_id/leads/:id
        def show
          render json: lead_json(@lead)
        end

        # POST /algorythmo/api/v1/accounts/:account_id/leads
        def create
          contact_id      = params.require(:lead).require(:contact_id)
          previous_lead_id = params.require(:lead)[:previous_lead_id]

          # H1 — IDOR guard: contact must belong to current account.
          unless Contact.exists?(id: contact_id, account_id: current_account.id)
            render json: { error: 'Contact not found' }, status: :not_found and return
          end

          # H1 — IDOR guard: previous_lead, when supplied, must belong to current account.
          if previous_lead_id.present? &&
             !Algorythmo::Lead.exists?(id: previous_lead_id, account_id: current_account.id)
            render json: { error: 'Lead not found' }, status: :not_found and return
          end

          stage = find_stage_for_account(params.require(:lead).require(:stage_id))
          max_pos = Algorythmo::Lead.where(stage: stage, deleted: false).maximum(:position) || 0.0

          lead = Algorythmo::Lead.create!(
            account: current_account,
            contact_id: contact_id,
            stage: stage,
            position: max_pos + 1.0,
            previous_lead_id: previous_lead_id,
            channel_origin: lead_params[:channel_origin],
            channel_metadata: lead_params[:channel_metadata],
            custom_fields: lead_params[:custom_fields],
            stage_entered_at: Time.current
          )

          render json: lead_json(lead), status: :created
        rescue ActiveRecord::RecordNotFound => e
          render json: { error: e.message }, status: :not_found
        rescue ActiveRecord::RecordInvalid => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        # PATCH /algorythmo/api/v1/accounts/:account_id/leads/:id
        def update
          # H1 — contact_id and previous_lead_id must not change after creation.
          @lead.update!(lead_params.except(:stage_id, :contact_id, :previous_lead_id))
          render json: lead_json(@lead)
        rescue ActiveRecord::RecordInvalid => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        # DELETE /algorythmo/api/v1/accounts/:account_id/leads/:id
        # Soft delete — sets deleted=true, preserves audit trail.
        # Restricted to admin (before_action above).
        def destroy
          @lead.update!(deleted: true)
          head :no_content
        end

        # PATCH /algorythmo/api/v1/accounts/:account_id/leads/:id/move
        # Body: { stage_id: <id> }
        def move
          stage = find_stage_for_account(params.require(:stage_id))
          @lead.move_to_stage(stage)
          render json: lead_json(@lead)
        rescue ActiveRecord::RecordNotFound => e
          render json: { error: e.message }, status: :not_found
        rescue ArgumentError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        # POST /algorythmo/api/v1/accounts/:account_id/leads/:id/reopen
        def reopen
          new_lead = @lead.reopen_as_new_lead
          render json: lead_json(new_lead), status: :created
        rescue ArgumentError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        private

        def set_lead
          @lead = Algorythmo::Lead.active.find_by!(account_id: current_account.id, id: params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Lead not found' }, status: :not_found
        end

        def find_stage_for_account(stage_id)
          pipeline = Algorythmo::Pipeline.find_by!(account: current_account)
          pipeline.stages.find(stage_id)
        end

        def lead_params
          # algorythmo: contact_id and previous_lead_id excluded from update path — see H1 note above
          params.require(:lead).permit(
            :stage_id, :position, :channel_origin,
            :deleted,
            channel_metadata: {},
            custom_fields: {}
          )
        end

        def lead_json(lead)
          {
            id:                lead.id,
            account_id:        lead.account_id,
            contact_id:        lead.contact_id,
            stage_id:          lead.stage_id,
            position:          lead.position,
            previous_lead_id:  lead.previous_lead_id,
            channel_origin:    lead.channel_origin,
            channel_metadata:  lead.channel_metadata,
            custom_fields:     lead.custom_fields,
            stage_entered_at:  lead.stage_entered_at,
            closed_at:         lead.closed_at,
            last_message_at:   lead.last_message_at,
            deleted:           lead.deleted,
            created_at:        lead.created_at,
            updated_at:        lead.updated_at
          }
        end

        # A.11 — Cursor pagination.
        # Cursor encodes (position, id) as Base64-JSON to keep the API opaque.
        # The query uses >= on position with an id tie-breaker to handle equal positions.
        def apply_cursor(scope, cursor_param, limit)
          if cursor_param.present?
            pos, cid = decode_cursor(cursor_param)
            scope = scope.where('(algorythmo_leads.position, algorythmo_leads.id) > (?, ?)', pos, cid)
          end

          scope.limit(limit)
        end

        def encode_cursor(lead)
          Base64.strict_encode64([lead.position.to_f, lead.id].to_json)
        end

        def decode_cursor(raw)
          JSON.parse(Base64.strict_decode64(raw))
        rescue ArgumentError, JSON::ParserError
          [0.0, 0]
        end
      end
    end
  end
end
