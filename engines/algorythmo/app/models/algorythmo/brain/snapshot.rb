# frozen_string_literal: true

module Algorythmo
  module Brain
    # Immutable snapshot of the brain's stats at a point in time.
    #
    # Created by SnapshotRecorder.record after each successful gbrain capture.
    # Read by SnapshotsController#index (paginated) and TimelineController#index.
    #
    # NO default_scope (D-A8) — all queries must be explicit.
    # stats  (jsonb): raw output of `gbrain stats` (page count, edge count, etc.)
    # trigger (string): what caused this snapshot — upload / adjustment / manual / cron.
    class Snapshot < Algorythmo::ApplicationRecord
      self.table_name = 'algorythmo_brain_snapshots'

      TRIGGERS = %w[upload adjustment manual cron].freeze

      belongs_to :account

      validates :taken_at, presence: true
      validates :trigger,  presence: true, inclusion: { in: TRIGGERS }
    end
  end
end
