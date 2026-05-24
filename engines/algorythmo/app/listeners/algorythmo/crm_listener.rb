# frozen_string_literal: true

# CrmListener — auto-creates or reopens a Lead when an incoming message arrives.
#
# Design decisions documented here (P1, C1, C2, F2, F3 from the plan §10/A.9):
#
# P1 — STATELESS SINGLETON (ADR-0001):
#   This listener is a Singleton included via BaseListener. Sidekiq runs jobs on
#   multiple threads sharing the same singleton instance. Any @ivar set on the
#   instance leaks state across concurrent jobs, causing data corruption.
#   Rule: ALL computation uses local variables or Rails.cache. ZERO @ivars here.
#
# C1 — filter: only incoming messages from Contact senders with a contact_id.
#
# F2 — idempotency: advisory lock serialises concurrent creates; RecordNotUnique
#   is rescued as a secondary guard (defence in depth).
#
# C2 — debouncing: if a closed lead exists with last_message_at within 7 days,
#   reopen instead of creating a new one. Beyond 7 days → new lead with chain.
#
# F3 — Pipeline/Stage cache via Pipeline.cached_default_for (1h TTL, auto-busted).
#
# algorythmo: auto-create-lead-d6
class Algorythmo::CrmListener < BaseListener
  include ::Events::Types

  # Entry point — called by AsyncDispatcher for every 'message.created' event.
  def message_created(event)
    message, account = extract_message_and_account(event)

    # algorythmo: feature-gate algorythmo_crm
    return unless Algorythmo::FeatureGate.cut_enabled?(account, 'crm')

    if outgoing_from_human?(message)
      set_owner_on_first_reply(account: account, message: message)
      return
    end

    # C1 — filter: only incoming messages from a Contact with a known contact_id.
    return unless eligible_message?(message)

    contact_id = message.conversation.contact_id
    process_lead_for(account: account, contact_id: contact_id, message: message)
  rescue StandardError => e
    # Never let a CRM listener crash bubble up and break message delivery.
    # algorythmo: ChatwootExceptionTracker forwards to Sentry/Honeybadger when configured — do not swallow silently
    ChatwootExceptionTracker.new(e, account: message&.conversation&.account).capture_exception
    Rails.logger.error("[CrmListener] #{e.class}: #{e.message}\n#{e.backtrace.first(20).join("\n")}")
  end

  private

  # §6.2 — True when message is a real human reply to the customer (not nota interna,
  # not campanha massiva, not regra de automação, not AgentBot, not external_echo).
  #
  # Inlines the same predicate as Chatwoot's Message#human_response? (app/models/message.rb:362)
  # because that method is `private` and can't be called from external classes.
  # Filters:
  #   - outgoing? — message goes to the customer (not incoming)
  #   - !private? — not a nota interna
  #   - sender.is_a?(User) — real agent (excludes AgentBot, Captain, external_echo)
  #   - automation_rule_id.blank? — not fired by an automation rule
  #   - campaign_id.blank? — not part of a mass campaign blast
  #   - conversation.contact_id.present? — known customer
  #
  # Semântica do produto: "primeiro vendedor que atender" = primeira resposta visível ao
  # cliente, feita por um humano agente registrado, fora de campanha/automação.
  def outgoing_from_human?(message)
    message.outgoing? &&
      !message.private? &&
      message.sender.is_a?(User) &&
      message.content_attributes['automation_rule_id'].blank? &&
      message.additional_attributes['campaign_id'].blank? &&
      message.conversation&.contact_id.present?
  end

  # §6.2 — Atomic first-writer-wins owner assignment.
  # Uses UPDATE ... WHERE owner_id IS NULL so that two concurrent Sidekiq workers
  # racing on the same lead never corrupt the owner field. The second UPDATE receives
  # 0 rows because the WHERE no longer matches after the first commits.
  def set_owner_on_first_reply(account:, message:)
    contact_id = message.conversation.contact_id

    # Adversarial review PR #51 — Crítico #2: cross-account integrity.
    # sender.is_a?(User) is not enough — SuperAdmin/staff users can reply to any conversation
    # without being members of that account. Without this guard, owner_id ends up pointing to
    # a user who isn't on the account → broken JOINs, leaked emails, frontend explodes.
    # Membership check is also a cheap second line of defense if a future Chatwoot patch
    # widens who can reply via API.
    unless AccountUser.exists?(account_id: account.id, user_id: message.sender_id)
      Rails.logger.debug { "[CrmListener] sender user=#{message.sender_id} is not a member of account=#{account.id}; skipping owner set" }
      return
    end

    open_lead = Algorythmo::Lead.active.open.find_by(contact_id: contact_id, account_id: account.id)
    unless open_lead
      # Debug (não warn): SDR/cold-outbound legitimamente bate aqui em volume.
      Rails.logger.debug { "[CrmListener] outgoing from user=#{message.sender_id} but no open lead for contact_id=#{contact_id}" }
      return
    end

    updated = Algorythmo::Lead
              .where(id: open_lead.id, owner_id: nil)
              .update_all(owner_id: message.sender_id, updated_at: Time.current) # rubocop:disable Rails/SkipsModelValidations

    Rails.logger.debug { "[CrmListener] owner already set for lead=#{open_lead.id}" } if updated.zero?
  end

  # C1 — Eligibility filter. Returns false for:
  #   - outgoing / activity / template messages
  #   - sender is a User (agent) not a Contact
  #   - no contact_id on the conversation (anonymous sessions)
  def eligible_message?(message)
    return false unless message.message_type == 'incoming'
    return false unless message.sender.is_a?(Contact)
    return false if message.conversation&.contact_id.blank?

    true
  end

  def process_lead_for(account:, contact_id:, message:)
    # F2 — Advisory lock via Postgres pg_advisory_xact_lock.
    # The lock key is a 64-bit integer derived from a namespaced hash.
    # This serialises concurrent message_created events for the same contact,
    # preventing duplicate Lead creation under high concurrency (verified in A.10 spec).
    advisory_key = advisory_lock_key(account.id, contact_id)

    Algorythmo::Lead.transaction do
      Algorythmo::Lead.connection.execute("SELECT pg_advisory_xact_lock(#{advisory_key})")
      upsert_lead_under_lock(account: account, contact_id: contact_id, message: message)
    end
  rescue ActiveRecord::RecordNotUnique
    # Defence in depth: the unique index fires if two transactions slip through
    # the advisory lock gap (e.g. lock not acquired in time, or non-PG DB in tests).
    # Log and swallow — the existing Lead is the correct outcome.
    Rails.logger.warn("[CrmListener] RecordNotUnique rescued for contact_id=#{contact_id} account_id=#{account&.id}")
  end

  # Runs inside the transaction + advisory lock taken by process_lead_for.
  # Three paths: existing open lead → bump timestamp; recently closed → reopen;
  # otherwise → create new (chained via previous_lead_id if older closed lead exists).
  #
  # M1-C — StageHistory:
  #   New lead: record_creation records from=nil (no after_update_commit fires on create).
  #   Reopen:   Lead#after_update_commit fires record_stage_transition (from=Won/Lost, to=Novo).
  #             record_creation is NOT called for reopens to avoid double-entry —
  #             the hook already captures the transition with from_stage populated.
  def upsert_lead_under_lock(account:, contact_id:, message:)
    open_lead = Algorythmo::Lead.active.open.find_by(contact_id: contact_id, account_id: account.id)
    if open_lead
      # Idempotent: bump last_message_at so C2 debouncing window stays current.
      # touch skips validations on purpose — we're updating a system timestamp,
      # not a domain field, and the row's invariants are unchanged.
      open_lead.touch(:last_message_at) # rubocop:disable Rails/SkipsModelValidations
      return
    end

    recent_closed_lead = recently_closed_lead(account.id, contact_id)
    if recent_closed_lead
      reopen_closed_lead(recent_closed_lead, message)
    else
      any_closed_lead = most_recent_closed_lead(account.id, contact_id)
      new_lead = create_new_lead(account: account, contact_id: contact_id, message: message, previous_lead: any_closed_lead)
      Algorythmo::StageHistoryRecorder.record_creation(new_lead) if new_lead
    end
  end

  # C2 — Find a closed Lead within the reopen window (last_message_at within 7 days).
  def recently_closed_lead(account_id, contact_id)
    Algorythmo::Lead
      .active
      .closed
      .where(contact_id: contact_id, account_id: account_id)
      .where('last_message_at >= ?', 7.days.ago)
      .order(last_message_at: :desc)
      .first
  end

  # C2 — Most recent closed lead regardless of window (for previous_lead_id chaining).
  def most_recent_closed_lead(account_id, contact_id)
    Algorythmo::Lead
      .active
      .closed
      .where(contact_id: contact_id, account_id: account_id)
      .order(last_message_at: :desc)
      .first
  end

  # C2 — Reopen an existing closed Lead back into the first open stage.
  # Uses _via_move_to_stage flag to bypass the guard_stage_id_change before_update callback
  # (§5.4). The after_update_commit hook records StageHistory(from=Won/Lost, to=Novo).
  def reopen_closed_lead(lead, _message)
    pipeline = Algorythmo::Pipeline.cached_default_for(lead.account)
    return unless pipeline

    novo_stage = pipeline.stages.find(&:open?)
    return unless novo_stage

    lead._via_move_to_stage = true
    lead.update!(
      stage: novo_stage,
      stage_entered_at: Time.current,
      closed_at: nil,
      last_message_at: Time.current
    )
  ensure
    lead._via_move_to_stage = false
  end

  def create_new_lead(account:, contact_id:, message:, previous_lead:)
    pipeline = Algorythmo::Pipeline.cached_default_for(account)
    return unless pipeline

    novo_stage = pipeline.stages.find(&:open?)
    return unless novo_stage

    max_pos = Algorythmo::Lead.where(stage: novo_stage, deleted: false).maximum(:position) || 0.0

    Algorythmo::Lead.create!(
      account: account,
      contact_id: contact_id,
      stage: novo_stage,
      position: max_pos + 1.0,
      previous_lead_id: previous_lead&.id,
      channel_origin: channel_origin_for(message),
      channel_metadata: channel_metadata_for(message),
      stage_entered_at: Time.current,
      last_message_at: Time.current
    )
  end

  CHANNEL_ORIGIN_MAP = {
    'Channel::WebWidget' => 'widget',
    'Channel::Whatsapp' => 'whatsapp',
    'Channel::Sms' => 'sms',
    'Channel::FacebookPage' => 'facebook',
    'Channel::Instagram' => 'instagram',
    'Channel::Tiktok' => 'tiktok',
    'Channel::Email' => 'email',
    'Channel::Telegram' => 'telegram',
    'Channel::TwitterProfile' => 'twitter',
    'Channel::Api' => 'api'
  }.freeze
  private_constant :CHANNEL_ORIGIN_MAP

  # Returns a normalised string origin key from the inbox channel type.
  # TwilioSms is split: SMS-mode → 'sms', WhatsApp-mode → 'whatsapp'.
  def channel_origin_for(message)
    inbox = message.conversation&.inbox
    return 'unknown' unless inbox

    return inbox.twilio_whatsapp? ? 'whatsapp' : 'sms' if inbox.channel_type == 'Channel::TwilioSms'

    CHANNEL_ORIGIN_MAP.fetch(inbox.channel_type, 'other')
  end

  # Captures free metadata from the contact/channel — zero external API calls (D6).
  def channel_metadata_for(message)
    contact = message.sender
    inbox   = message.conversation&.inbox

    {
      contact_name: contact&.name,
      contact_email: contact&.email,
      contact_phone: contact&.phone_number,
      inbox_name: inbox&.name,
      channel_type: inbox&.channel_type
    }.compact
  end

  # Derives a stable 64-bit Postgres advisory lock key from (account_id, contact_id).
  # Uses a Fowler-Noll-Vo-style mix to spread keys across the int64 space without
  # requiring an external gem. The namespace prefix 'crm:lead' prevents collision
  # with any other advisory locks in the host app.
  def advisory_lock_key(account_id, contact_id)
    raw = Digest::SHA1.hexdigest("crm:lead:#{account_id}:#{contact_id}")
    # Take 15 hex digits (60 bits) to fit in a signed int64 safely.
    raw[0, 15].to_i(16)
  end
end
