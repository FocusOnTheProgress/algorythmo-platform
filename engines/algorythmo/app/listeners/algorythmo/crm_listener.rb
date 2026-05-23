# frozen_string_literal: true

module Algorythmo
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
  class CrmListener < BaseListener
    include ::Events::Types

    # Entry point — called by AsyncDispatcher for every 'message.created' event.
    def message_created(event)
      message, account = extract_message_and_account(event)

      # algorythmo: feature-gate algorythmo_crm
      return unless Algorythmo::FeatureGate.feature_enabled?(account, 'algorythmo_crm')

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

    # C1 — Eligibility filter. Returns false for:
    #   - outgoing / activity / template messages
    #   - sender is a User (agent) not a Contact
    #   - no contact_id on the conversation (anonymous sessions)
    def eligible_message?(message)
      return false unless message.message_type == 'incoming'
      return false unless message.sender.is_a?(Contact)
      return false unless message.conversation&.contact_id.present?

      true
    end

    def process_lead_for(account:, contact_id:, message:)
      # F2 — Advisory lock via Postgres pg_advisory_xact_lock.
      # The lock key is a 64-bit integer derived from a namespaced hash.
      # This serialises concurrent message_created events for the same contact,
      # preventing duplicate Lead creation under high concurrency (verified in A.10 spec).
      advisory_key = advisory_lock_key(account.id, contact_id)

      Algorythmo::Lead.transaction do
        # pg_advisory_xact_lock blocks until the lock is acquired and releases at
        # transaction end. Within the lock window, the SELECT below is definitive.
        Algorythmo::Lead.connection.execute(
          "SELECT pg_advisory_xact_lock(#{advisory_key})"
        )

        # F2 — Check for existing open Lead inside the lock.
        open_lead = Algorythmo::Lead
                    .active
                    .open
                    .find_by(contact_id: contact_id, account_id: account.id)

        if open_lead
          # Idempotent: update last_message_at so C2 debouncing window stays current.
          open_lead.update_column(:last_message_at, Time.current)
          return
        end

        # C2 — Debouncing: look for a recently closed lead (within 7-day window).
        recent_closed_lead = recently_closed_lead(account.id, contact_id)

        if recent_closed_lead
          # Within window — reopen instead of creating a duplicate.
          reopen_closed_lead(recent_closed_lead, message)
        else
          # Beyond window (or first ever message): create a new lead.
          # If there is an older closed lead, chain via previous_lead_id.
          any_closed_lead = most_recent_closed_lead(account.id, contact_id)
          create_new_lead(account: account, contact_id: contact_id, message: message, previous_lead: any_closed_lead)
        end
      end
    rescue ActiveRecord::RecordNotUnique
      # Defence in depth: the unique index fires if two transactions slip through
      # the advisory lock gap (e.g. lock not acquired in time, or non-PG DB in tests).
      # Log and swallow — the existing Lead is the correct outcome.
      Rails.logger.warn("[CrmListener] RecordNotUnique rescued for contact_id=#{contact_id} account_id=#{account&.id}")
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
    def reopen_closed_lead(lead, message)
      pipeline = Algorythmo::Pipeline.cached_default_for(lead.account)
      return unless pipeline

      novo_stage = pipeline.stages.find { |s| s.open? }
      return unless novo_stage

      lead.update!(
        stage: novo_stage,
        stage_entered_at: Time.current,
        closed_at: nil,
        last_message_at: Time.current
      )
    end

    def create_new_lead(account:, contact_id:, message:, previous_lead:)
      pipeline = Algorythmo::Pipeline.cached_default_for(account)
      return unless pipeline

      novo_stage = pipeline.stages.find { |s| s.open? }
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

    # Returns a normalised string origin key from the inbox channel type.
    def channel_origin_for(message)
      inbox = message.conversation&.inbox
      return 'unknown' unless inbox

      case inbox.channel_type
      when 'Channel::WebWidget'    then 'widget'
      when 'Channel::Whatsapp'     then 'whatsapp'
      when 'Channel::TwilioSms'    then inbox.twilio_whatsapp? ? 'whatsapp' : 'sms'
      when 'Channel::Sms'          then 'sms'
      when 'Channel::FacebookPage' then 'facebook'
      when 'Channel::Instagram'    then 'instagram'
      when 'Channel::Tiktok'       then 'tiktok'
      when 'Channel::Email'        then 'email'
      when 'Channel::Telegram'     then 'telegram'
      when 'Channel::TwitterProfile' then 'twitter'
      when 'Channel::Api'          then 'api'
      else 'other'
      end
    end

    # Captures free metadata from the contact/channel — zero external API calls (D6).
    def channel_metadata_for(message)
      contact = message.sender
      inbox   = message.conversation&.inbox

      {
        contact_name:   contact&.name,
        contact_email:  contact&.email,
        contact_phone:  contact&.phone_number,
        inbox_name:     inbox&.name,
        channel_type:   inbox&.channel_type
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
end
