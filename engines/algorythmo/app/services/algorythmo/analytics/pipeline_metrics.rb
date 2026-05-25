# frozen_string_literal: true

# Computes funnel observability metrics for a single Algorythmo::Pipeline.
#
# Why this service exists (M1-D):
#   The Kanban today renders cards, but it cannot answer "where does the sale
#   stall?". The Brain (M3) and the C-level dashboard (Andar 2) both need a
#   stable per-stage signal to act on. Wrapping the computation behind a single
#   service keeps the SQL pattern owned in one place — controller, future
#   websocket push, and Sidekiq export job will all share it.
#
# Per-stage:
#   - lead_count:                 leads currently sitting in the stage (active scope).
#   - avg_time_in_stage_seconds:  average duration of stays. A "stay" is the
#                                 interval (entered_at, exited_at). Closed stays
#                                 (lead already left) count when exited_at falls
#                                 in the last 90 days; open stays (lead is still
#                                 in the stage) use Time.current as exited_at
#                                 and always count.
#   - conversion_rate_to_next:    among CLOSED stays in the window, fraction
#                                 that exited to the stage with the next greater
#                                 position. nil for terminal stages (won/lost)
#                                 and nil when there is no next stage.
#
# Funnel summary:
#   - open_leads:        leads currently in any open-kind stage.
#   - avg_funnel_hours:  for leads that reached a won stage in the window, the
#                        average lifetime from the first stage_history row
#                        (creation) to closed_at, in hours.
#   - conversion_rate:   won_count / (won_count + lost_count) over the window.
#
# Window:
#   90 days from Time.current. The window is short enough that stale legacy
#   data (account that has run for years) does not drag the headline numbers
#   down, but long enough to absorb monthly seasonality of the typical SMB
#   sales cycle.
#
# Cache:
#   60-second Rails.cache.fetch — same TTL decision as Algorythmo::FeatureGate
#   (P2/T7). The cache key is versioned by the most-recent stage_history
#   timestamp for the (account, pipeline) tuple, so any move/creation in the
#   pipeline busts the key instantly — agents never see stale numbers after a
#   drag-and-drop, even when several agents work the same board in parallel.
#   The TTL itself is the safety net for the no-write idle case (board open,
#   no one moves anything): recompute at least once a minute so newly-aged
#   open stays roll into the avg. Fail-closed on an empty account (zero leads,
#   zero histories) returns a fully-shaped zero payload — never an exception.
module Algorythmo
  module Analytics
    class PipelineMetrics
      WINDOW = 90.days
      CACHE_TTL = 60.seconds

      def initialize(account:, pipeline:)
        @account = account
        @pipeline = pipeline
      end

      def call
        Rails.cache.fetch(cache_key, expires_in: CACHE_TTL) { compute }
      end

      private

      attr_reader :account, :pipeline

      def cache_key
        "algorythmo:pipeline_metrics:#{account.id}:#{pipeline.id}:#{cache_version_stamp}"
      end

      # Latest stage_history timestamp scoped to this (account, pipeline). One
      # indexed MAX() per request — cheap (sub-millisecond on the existing
      # index_algorythmo_stage_histories_on_lead_id_and_created_at). The cache
      # key changes the instant any lead in this pipeline moves, so the next
      # request returns fresh data instead of waiting for the TTL.
      #
      # Returns 0 for an empty pipeline so the key is stable across cold reads.
      def cache_version_stamp
        ts = Algorythmo::StageHistory
             .joins(:to_stage, :lead)
             .where(algorythmo_stages: { pipeline_id: pipeline.id })
             .where(algorythmo_leads: { account_id: account.id })
             .maximum(:created_at)
        ts ? ts.to_i : 0
      end

      def compute
        now = Time.current
        window_start = now - WINDOW

        # Stages are ordered by position — position drives the "next stage"
        # lookup for conversion_rate_to_next.
        stages = pipeline.stages.order(:position, :id).to_a
        next_stage_id_by = build_next_stage_index(stages)

        # Soft-deleted leads (deleted=true) are excluded from BOTH lead_count and
        # the history-derived stays. The product affordance is "leads removed from
        # the funnel" — counting their past time-in-stage would muddy the average
        # with funnels the agent already abandoned.
        leads = Algorythmo::Lead
                .active
                .where(account_id: account.id, stage_id: stages.map(&:id))
                .to_a

        histories_by_lead = load_histories(leads.map(&:id), window_start)
        stays_by_stage = build_stays(histories_by_lead, now)

        {
          pipeline_id: pipeline.id,
          computed_at: now.utc.iso8601,
          ttl_seconds: CACHE_TTL.to_i,
          summary: summary(leads, stages, histories_by_lead, window_start),
          stages: stages.map do |stage|
            stays = stays_by_stage[stage.id]
            {
              stage_id: stage.id,
              stage_kind: stage.kind,
              lead_count: open_lead_count(leads, stage),
              avg_time_in_stage_seconds: avg_time_in_stage(stays, window_start),
              conversion_rate_to_next: conversion_to_next(stage, stays, next_stage_id_by, window_start)
            }
          end
        }
      end

      # Bounds the memory footprint on aged accounts: an account that has run
      # for years can accumulate 100k+ history rows per pipeline, and the
      # original unbounded scan loaded all of them. We only need rows from one
      # window prior to the cutoff — that is enough to (a) build every closed
      # stay whose exited_at lies inside the window (its entered_at row is at
      # most WINDOW older), and (b) reconstruct open stays whose entered_at
      # falls within `[window_start - WINDOW, now]`. Open stays older than
      # `window_start - WINDOW` are intentionally dropped — they would
      # otherwise dominate the avg with multi-year durations the funnel was
      # never meant to surface.
      def load_histories(lead_ids, window_start)
        return {} if lead_ids.empty?

        Algorythmo::StageHistory
          .where(lead_id: lead_ids)
          .where('created_at >= ?', window_start - WINDOW)
          .order(:created_at, :id)
          .to_a
          .group_by(&:lead_id)
      end

      # Walks each lead's chronological history once. For each row, the lead
      # exits the row's to_stage at the NEXT row's created_at (or Time.current
      # if there is no next row, meaning the lead is still there). Each entry
      # becomes a "stay" attributed to the row's to_stage.
      def build_stays(histories_by_lead, now)
        stays_by_stage = Hash.new { |h, k| h[k] = [] }

        histories_by_lead.each_value do |rows|
          rows.each_with_index do |row, idx|
            next_row = rows[idx + 1]
            stays_by_stage[row.to_stage_id] << {
              entered_at: row.created_at,
              exited_at: next_row&.created_at || now,
              closed: !next_row.nil?,
              next_stage_id: next_row&.to_stage_id
            }
          end
        end

        stays_by_stage
      end

      def build_next_stage_index(stages)
        idx = {}
        stages.each_cons(2) { |a, b| idx[a.id] = b.id }
        idx
      end

      def open_lead_count(leads, stage)
        leads.count { |l| l.stage_id == stage.id }
      end

      # Returns 0 when no stays fall inside the window. Using 0 (not nil) so
      # the Kanban chip renders a deterministic "0s" placeholder instead of
      # vanishing — agents reading the board see a complete summary even on
      # a brand new account.
      def avg_time_in_stage(stays, window_start)
        relevant = stays.select { |s| !s[:closed] || s[:exited_at] >= window_start }
        return 0 if relevant.empty?

        total = relevant.sum { |s| (s[:exited_at] - s[:entered_at]).to_f }
        (total / relevant.size).round
      end

      # nil when the stage is terminal (won/lost) or when there is no next
      # stage in the pipeline. nil also when no lead has exited this stage in
      # the window — distinguished from "0% conversion" because 0/0 is not 0.
      def conversion_to_next(stage, stays, next_stage_id_by, window_start)
        return nil if stage.kind == 'won' || stage.kind == 'lost'

        next_id = next_stage_id_by[stage.id]
        return nil unless next_id

        closed_in_window = stays.select { |s| s[:closed] && s[:exited_at] >= window_start }
        return nil if closed_in_window.empty?

        moved_to_next = closed_in_window.count { |s| s[:next_stage_id] == next_id }
        (moved_to_next.to_f / closed_in_window.size).round(4)
      end

      def summary(leads, stages, histories_by_lead, window_start)
        won_stage_ids  = stages.select { |s| s.kind == 'won' }.map(&:id)
        lost_stage_ids = stages.select { |s| s.kind == 'lost' }.map(&:id)
        open_stage_ids = stages.select { |s| s.kind == 'open' }.map(&:id)

        open_count = leads.count { |l| open_stage_ids.include?(l.stage_id) }

        won_in_window  = leads.select { |l| won_stage_ids.include?(l.stage_id) && l.closed_at && l.closed_at >= window_start }
        lost_in_window = leads.select { |l| lost_stage_ids.include?(l.stage_id) && l.closed_at && l.closed_at >= window_start }

        {
          open_leads: open_count,
          avg_funnel_hours: avg_funnel_hours(won_in_window, histories_by_lead),
          conversion_rate: conversion_rate(won_in_window, lost_in_window)
        }
      end

      # First stage_history row per lead pinpoints when the lead entered the
      # pipeline. record_creation runs synchronously when CrmListener creates
      # a Lead, so every lead has at least one row — the .first fallback to
      # lead.created_at is defensive (a future job that bulk-creates leads
      # without a listener trip would not insert that row).
      def avg_funnel_hours(won_in_window, histories_by_lead)
        return 0 if won_in_window.empty?

        total_seconds = won_in_window.sum do |lead|
          start_at = histories_by_lead[lead.id]&.first&.created_at || lead.created_at
          (lead.closed_at - start_at).to_f
        end
        (total_seconds / won_in_window.size / 3600.0).round(2)
      end

      def conversion_rate(won_in_window, lost_in_window)
        total = won_in_window.size + lost_in_window.size
        return 0 if total.zero?

        (won_in_window.size.to_f / total).round(4)
      end
    end
  end
end
