# frozen_string_literal: true

module Algorythmo
  module Brain
    # Tracks ingestion state for each (account, conversation) pair.
    #
    # One row per pair — unique index enforces idempotency at the DB level.
    # account_id is present as scaffold for M3.5 multi-tenant; Day-1 is always the
    # founder account. NO default_scope — all queries must be explicit (D-A8).
    #
    # outcome enum maps to the `outcome` integer column:
    #   0 = success  — captured and indexed into the brain
    #   1 = skipped  — forward-only gate or duplicate guard, no action taken
    #   2 = failed   — capture raised; last_error populated; Sidekiq will retry
    class IngestionLog < Algorythmo::ApplicationRecord
      belongs_to :account
      belongs_to :conversation

      enum outcome: { success: 0, skipped: 1, failed: 2 }, _prefix: false

      validates :account,      presence: true
      validates :conversation, presence: true
      validates :outcome,      presence: true
    end
  end
end
