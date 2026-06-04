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
    # Errors from the gbrain subprocess are not swallowed — they propagate so
    # callers (workers) can decide on retry/skip policy.  The one exception is
    # that a missing or malformed stats result never raises; instead an empty
    # hash is stored so the row is still created and the history entry is
    # preserved.
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
          account_id:   @account_id,
          taken_at:     Time.current,
          stats:        current_stats,
          diff_summary: build_diff(previous, current_stats),
          trigger:      @trigger
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
      # Keys inspected: "pages" / "page_count" / "edges" / "edge_count"
      # (gbrain stats shape is A CONFIRMAR — we read both candidate names
      #  defensively and fall back gracefully when a key is absent).
      def build_diff(previous, current_stats)
        return nil if previous.nil?

        prev_stats = previous.stats || {}

        pages_before = extract_count(prev_stats, 'pages', 'page_count')
        pages_after  = extract_count(current_stats, 'pages', 'page_count')
        edges_before = extract_count(prev_stats, 'edges', 'edge_count')
        edges_after  = extract_count(current_stats, 'edges', 'edge_count')

        parts = []
        parts << delta_line('pages', pages_before, pages_after) if pages_before || pages_after
        parts << delta_line('edges', edges_before, edges_after) if edges_before || edges_after
        parts.compact.join('; ').presence || 'no measurable change'
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
        "#{label}: #{before}→#{after} (#{sign}#{diff})"
      end
    end
  end
end
