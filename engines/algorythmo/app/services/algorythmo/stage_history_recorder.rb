# frozen_string_literal: true

# Records stage transition history for Algorythmo::Lead.
#
# Two public entry points:
#   record_creation(lead)             — used by CrmListener after new lead create only.
#                                       Reopen path is handled by record_transition via
#                                       Lead#after_update_commit (stage_id changes → hook fires).
#   record_transition(lead, from:, to:) — used by Lead#after_update_commit hook.
#
# Actor resolution — verified against Chatwoot lib/current.rb (thread_mattr_accessor,
# NOT ActiveSupport::CurrentAttributes). Current.agent_bot does NOT exist; AgentBots
# arrive as Current.user. Discriminating via `case Current.user` is the correct pattern.
#
# Failure contract: insert errors are rescued and logged. A failed history insert must
# NOT roll back a committed lead move (hooks run after_commit). Reconciliation is M3.
module Algorythmo
  class StageHistoryRecorder
    # Called by CrmListener after a NEW lead is created (not for reopens).
    # Reopens are recorded automatically via Lead#after_update_commit (stage_id changes).
    # Idempotent: skips if the last StageHistory for this lead already records
    # arrival at the same to_stage within the last minute (guards against Sidekiq
    # retry delivering the same event twice — §8.2).
    def self.record_creation(lead)
      last = lead.stage_histories.order(:created_at).last
      if last && last.to_stage_id == lead.stage_id && last.created_at >= 1.minute.ago
        Rails.logger.info("[StageHistoryRecorder] skipping duplicate creation entry for lead=#{lead.id}")
        return
      end

      Algorythmo::StageHistory.create!(
        lead: lead,
        from_stage_id: nil,
        to_stage: lead.stage,
        **resolve_actor
      )
    rescue ActiveRecord::RecordInvalid => e
      ChatwootExceptionTracker.new(e, account: lead.account).capture_exception
      Rails.logger.error("[StageHistoryRecorder] record_creation failed for lead=#{lead.id}: #{e.message}")
    end

    # Called by Lead#after_update_commit when stage_id changes.
    # from and to are Stage objects resolved from saved_changes by the model.
    def self.record_transition(lead, from:, to:)
      Algorythmo::StageHistory.create!(
        lead: lead,
        from_stage: from,
        to_stage: to,
        **resolve_actor
      )
    rescue ActiveRecord::RecordInvalid => e
      ChatwootExceptionTracker.new(e, account: lead.account).capture_exception
      Rails.logger.error("[StageHistoryRecorder] record_transition failed for lead=#{lead.id}: #{e.message}")
    end

    # Resolves the actor from Current.user.
    #
    # CONTRACT: this method TRUSTS whatever is in Current.user — it cannot
    # distinguish a stale User instance (leaked from a prior Sidekiq job) from a
    # legitimate one. Both match `when ::User` and get attributed identically.
    #
    # The DEFENCE against stale Current state lives UPSTREAM:
    #   engines/algorythmo/config/initializers/algorythmo_sidekiq_current_reset.rb
    # which installs a Sidekiq server middleware calling `Current.reset` before
    # and after every job. By the time the recorder runs inside a job, Current
    # is guaranteed to reflect only what the current job itself set (or nil).
    #
    # Type filtering here is a secondary guard: an unrecognised class (e.g.
    # Object.new) falls through to 'system'. This catches future bugs where a
    # non-User/non-AgentBot gets assigned to Current.user, but it is NOT the
    # stale-state defence.
    def self.resolve_actor
      actor = Current.user
      case actor
      when AgentBot
        { actor_type: 'agent_bot', actor_id: actor.id }
      when ::User
        { actor_type: 'user', actor_id: actor.id }
      else
        { actor_type: 'system', actor_id: nil }
      end
    end
    private_class_method :resolve_actor
  end
end
