# frozen_string_literal: true

# LeadsController — CRUD + move + reopen + conversations for Algorythmo::Lead.
#
# A.11 — Cursor pagination (P2):
#   GET index uses a (position, id) cursor — never offset.
#   Reason: offset pagination on a float position column causes phantom/duplicate
#   cards when leads are reordered between pages. The composite cursor is stable.
#   The index (account_id, stage_id, position) ensures this query uses an index scan.
#
# B.0 — Extensions:
#   GET index now accepts contact_id as an alternative filter to stage_id.
#   lead_json now embeds a contact: summary block.
#   GET :id/conversations returns cursor-paginated Conversation records for the
#   lead's contact, supporting the LeadDetailDrawer history view (Q-B5).
#
# Offset pagination is intentionally absent from this controller.
class Algorythmo::Api::V1::LeadsController < Algorythmo::Api::V1::BaseController
  before_action :set_lead, only: %i[show update destroy move reopen conversations]
  # algorythmo: admin-only — soft-delete is irreversible via API; agents cannot delete leads
  before_action :check_admin_authorization?, only: %i[destroy]

  DEFAULT_LIMIT               = 50
  MAX_LIMIT                   = 200
  DEFAULT_CONVERSATIONS_LIMIT = 10
  MAX_CONVERSATIONS_LIMIT     = 100
  MAX_LEADS_PER_CONTACT       = 50
  # Upper bound for Postgres bigint (2**63 - 1). Cursors carrying ids beyond
  # this value would cause a PG::NumericValueOutOfRange on the WHERE clause.
  MAX_BIGINT                  = 9_223_372_036_854_775_807

  # GET /algorythmo/api/v1/accounts/:account_id/leads
  # Query params (mutually exclusive filters — exactly one required):
  #   stage_id   — filters by stage, cursor-paginates (position, id)
  #   contact_id — filters by contact, returns open leads only, no cursor
  #   cursor     — optional; opaque string encoding (position, id) from prev page
  #   limit      — optional; default 50, max 200
  #
  # Response:
  #   { leads: [...], next_cursor: "..." | null }
  def index
    if params[:contact_id].present?
      index_by_contact
    elsif params[:stage_id].present?
      index_by_stage
    else
      render json: { error: 'stage_id or contact_id is required' }, status: :bad_request
    end
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
    render json: { error: 'Contact not found' }, status: :not_found and return unless Contact.exists?(id: contact_id, account_id: current_account.id)

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
  rescue ActiveRecord::RecordNotUnique
    render json: { error: 'Open lead already exists for this contact' }, status: :conflict
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

  # GET /algorythmo/api/v1/accounts/:account_id/leads/:id/conversations
  # Query params:
  #   cursor — optional; opaque string encoding (created_at, id) from prev page
  #   limit  — optional; default 10, max 100
  #
  # Returns conversations for the lead's contact that the current user may access,
  # newest first (desc created_at). Non-admin agents see only inboxes they belong to.
  # IDOR: set_lead before_action already ensures @lead.account_id == current_account.id.
  #
  # Response:
  #   { conversations: [...], next_cursor: "..." | null }
  def conversations
    limit = if params[:limit].present?
              [[params[:limit].to_i, 1].max, MAX_CONVERSATIONS_LIMIT].min
            else
              DEFAULT_CONVERSATIONS_LIMIT
            end

    # B1 — privilege scope: admins see all; agents see only their inboxes.
    base_scope = Conversation
                 .where(contact_id: @lead.contact_id, account_id: current_account.id)
                 .order(created_at: :desc, id: :desc)

    scope = Conversations::PermissionFilterService.new(
      base_scope, current_user, current_account
    ).perform

    decoded = decode_conversation_cursor(params[:cursor])
    if decoded
      ts, cid = decoded
      scope = scope.where(
        '(conversations.created_at, conversations.id) < (?, ?)',
        ts, cid
      )
    end

    page = scope.limit(limit + 1).to_a

    has_more = page.size > limit
    page     = page.first(limit)
    next_cursor = if has_more
                    last = page.last
                    encode_conversation_cursor(last.created_at, last.id)
                  end

    render json: {
      conversations: page.map { |c| conversation_json(c) },
      next_cursor: next_cursor
    }
  end

  private

  def index_by_contact
    # H1 — IDOR guard: contact must belong to current account before filtering leads.
    unless Contact.exists?(id: params[:contact_id], account_id: current_account.id)
      render json: { error: 'Contact not found' }, status: :not_found and return
    end

    # H2 — plan §5 B.0 specifies only open leads; .active would include won/lost leads.
    leads = Algorythmo::Lead
            .open
            .where(account_id: current_account.id, contact_id: params[:contact_id])
            .includes(:stage, :owner, contact: { avatar_attachment: :blob })
            .order(:id)
            .limit(MAX_LEADS_PER_CONTACT)

    render json: { leads: leads.map { |l| lead_json(l) }, next_cursor: nil }
  end

  def index_by_stage
    limit = [[params.fetch(:limit, DEFAULT_LIMIT).to_i, 1].max, MAX_LIMIT].min

    base = Algorythmo::Lead
           .active
           .where(account_id: current_account.id, stage_id: params[:stage_id])
           .includes(:stage, :owner, contact: { avatar_attachment: :blob })
           .order(:position, :id)

    leads = apply_lead_cursor(base, params[:cursor], limit + 1)

    has_more   = leads.size > limit
    page_leads = leads.first(limit)

    render json: {
      leads: page_leads.map { |l| lead_json(l) },
      next_cursor: has_more ? encode_lead_cursor(page_leads.last) : nil
    }
  end

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
    # algorythmo: contact_id and previous_lead_id excluded from update path — see H1 note above.
    # algorythmo: :deleted excluded — soft-delete must only flow through destroy (admin-gated);
    #   permitting it here would allow any agent to soft-delete via PATCH, bypassing the
    #   check_admin_authorization? guard on destroy.
    params.require(:lead).permit(
      :stage_id, :position, :channel_origin,
      channel_metadata: {},
      custom_fields: {}
    )
  end

  def lead_json(lead)
    {
      id: lead.id,
      account_id: lead.account_id,
      contact_id: lead.contact_id,
      stage_id: lead.stage_id,
      position: lead.position,
      previous_lead_id: lead.previous_lead_id,
      channel_origin: lead.channel_origin,
      channel_metadata: lead.channel_metadata,
      custom_fields: lead.custom_fields,
      stage_entered_at: lead.stage_entered_at,
      closed_at: lead.closed_at,
      last_message_at: lead.last_message_at,
      deleted: lead.deleted,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      owner: owner_summary(lead.owner),
      contact: contact_summary(lead.contact)
    }
  end

  # §7.2 — Compact owner summary embedded in lead JSON. Nullable when owner_id is nil.
  def owner_summary(user)
    return nil unless user

    {
      id: user.id,
      name: user.name,
      thumbnail: user.avatar_url
    }
  end

  # B.0 — Compact contact summary embedded in lead JSON.
  # avatar_url comes from the Avatarable concern included in Contact.
  def contact_summary(contact)
    return nil unless contact

    {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone_number: contact.phone_number,
      thumbnail: contact.avatar_url
    }
  end

  def conversation_json(conversation)
    {
      id: conversation.id,
      display_id: conversation.display_id,
      status: conversation.status,
      inbox_id: conversation.inbox_id,
      last_activity_at: conversation.last_activity_at,
      created_at: conversation.created_at
    }
  end

  # A.11 — Cursor pagination (position, id) for stage-filtered index.
  def apply_lead_cursor(scope, cursor_param, limit)
    decoded = decode_lead_cursor(cursor_param)
    if decoded
      pos, cid = decoded
      scope = scope.where('(algorythmo_leads.position, algorythmo_leads.id) > (?, ?)', pos, cid)
    end

    scope.limit(limit)
  end

  def encode_lead_cursor(lead)
    Base64.urlsafe_encode64([lead.position.to_f, lead.id].to_json)
  end

  # B.0 — Separate cursor encoder for conversations (ISO8601 timestamp, id).
  # Using ISO8601 with microseconds to match Postgres timestamp precision.
  def encode_conversation_cursor(created_at, id)
    Base64.urlsafe_encode64([created_at.iso8601(6), id].to_json)
  end

  # Decodes a (position Float, id Integer) lead cursor.
  # Returns [Float, Integer] on success, nil on any malformed input.
  # Nil means "no cursor applied" — caller renders the first page.
  #
  # Type-checks before coercion so that passing nil/Array/Hash elements
  # (e.g. [null, null] from JSON) never reaches Float()/Integer() and
  # raises TypeError, which was not caught by the old rescue clause.
  # Bigint cap prevents PG::NumericValueOutOfRange on the WHERE clause.
  def decode_lead_cursor(raw)
    return nil if raw.blank?

    parsed = JSON.parse(Base64.urlsafe_decode64(raw))
    return nil unless parsed.is_a?(Array) && parsed.size == 2
    return nil unless parsed[0].is_a?(Numeric) && parsed[1].is_a?(Integer)

    pos = Float(parsed[0])
    cid = Integer(parsed[1])
    return nil if cid.negative? || cid > MAX_BIGINT

    [pos, cid]
  rescue ArgumentError, TypeError, JSON::ParserError
    nil
  end

  # Decodes a (created_at ISO8601, id Integer) conversation cursor.
  # Returns [Time, Integer] on success, nil on any malformed input.
  # Nil means "no cursor applied" — caller renders the first page.
  #
  # Type-checks before coercion: Time.iso8601(nil) and Time.iso8601(42) raise
  # TypeError (not ArgumentError), which the old rescue clause missed.
  # Bigint cap prevents PG::NumericValueOutOfRange on the WHERE clause.
  def decode_conversation_cursor(raw)
    return nil if raw.blank?

    parsed = JSON.parse(Base64.urlsafe_decode64(raw))
    return nil unless parsed.is_a?(Array) && parsed.size == 2
    return nil unless parsed[0].is_a?(String) && parsed[1].is_a?(Integer)

    ts  = Time.iso8601(parsed[0])
    cid = Integer(parsed[1])
    return nil if cid.negative? || cid > MAX_BIGINT

    [ts, cid]
  rescue ArgumentError, TypeError, JSON::ParserError
    nil
  end
end
