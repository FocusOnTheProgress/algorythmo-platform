# frozen_string_literal: true

module Algorythmo
  module Brain
    # Records a lightweight snapshot of the brain's current state.
    #
    # Calls `gbrain stats` (read-only, no WriteLock needed) and persists the
    # result as an Algorythmo::Brain::Snapshot row.  Also computes a human-
    # readable diff_summary against the most recent prior snapshot for the
    # same account.
    #
    # Usage:
    #   Algorythmo::Brain::SnapshotRecorder.record(account_id: 2, trigger: 'cron')
    #
    # Errors from the gbrain subprocess propagate — callers (workers) decide on
    # retry/skip policy.  A missing or malformed stats result is stored as {}
    # so the row is still created and the history entry is preserved.
    class SnapshotRecorder
      KNOWN_TRIGGERS = Algorythmo::Brain::Snapshot::TRIGGERS

      # @param account_id [Integer]
      # @param trigger    [String]  one of KNOWN_TRIGGERS
      # @return [Algorythmo::Brain::Snapshot]
      def self.record(account_id:, trigger:)
        new(account_id: account_id, trigger: trigger).record
      end

      def initialize(account_id:, trigger:)
        @account_id = Integer(account_id)
        @trigger    = trigger.to_s
      end

      def record
        current_stats = fetch_stats
        previous      = previous_snapshot

        Algorythmo::Brain::Snapshot.create!(
          account_id: @account_id,
          taken_at: Time.current,
          stats: current_stats,
          diff_summary: build_diff(previous, current_stats),
          trigger: @trigger
        )
      end

      private

      def fetch_stats
        result = Algorythmo::Brain::Client.new(@account_id).stats
        result.is_a?(Hash) ? result : {}
      end

      def previous_snapshot
        Algorythmo::Brain::Snapshot
          .where(account_id: @account_id)
          .order(taken_at: :desc)
          .first
      end

      # Builds a single human-readable line describing what changed.
      # Returns nil when there is no prior snapshot (first ever snapshot).
      #
      # Keys inspected: "pages" / "page_count" and "edges" / "edge_count"
      # (gbrain stats shape is A CONFIRMAR — we read both candidate names
      #  defensively and fall back gracefully when a key is absent).
      def build_diff(previous, current_stats)
        return nil if previous.nil?

        prev_stats = previous.stats || {}
        parts      = diff_parts(prev_stats, current_stats)
        parts.empty? ? 'no measurable change' : parts.join('; ')
      end

      def diff_parts(prev_stats, current_stats)
        [
          delta_line('pages', extract_count(prev_stats, 'pages', 'page_count'),
                     extract_count(current_stats, 'pages', 'page_count')),
          delta_line('edges', extract_count(prev_stats, 'edges', 'edge_count'),
                     extract_count(current_stats, 'edges', 'edge_count'))
        ].compact
      end

      def extract_count(hash, *keys)
        keys.each do |k|
          v = hash[k] || hash[k.to_sym]
          return v.to_i if v
        end
        nil
      end

      def delta_line(label, before, after)
        return nil if before.nil? && after.nil?

        before ||= 0
        after  ||= 0
        diff     = after - before
        sign     = diff >= 0 ? '+' : ''
        "#{label}: #{before}->#{after} (#{sign}#{diff})"
      end
    end
  end
end
