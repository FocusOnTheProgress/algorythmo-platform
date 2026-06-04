# frozen_string_literal: true

# GET /algorythmo/api/v1/accounts/:account_id/brain/timeline
#
# Returns a chronological timeline of brain events for the account.
# Derived from two sources:
#   1. algorythmo_brain_snapshots — capture/upload/adjustment/cron events.
#   2. algorythmo_brain_ingestion_logs — conversation ingestion events (success only).
#
# Events are sorted newest-first.  Brain with no history = [] (honest empty-state).
# Auth chain inherited from Brain::BaseController (5 levels, fail-closed).
#
# Shape per event:
#   { id, type, occurred_at, summary, trigger, meta }
class Algorythmo::Api::V1::Brain::TimelineController < Algorythmo::Api::V1::Brain::BaseController
  PAGE_SIZE = 30

  def index
    page        = [params.fetch(:page, 1).to_i, 1].max
    events      = build_timeline_events(current_account.id, page: page)
    total_count = Algorythmo::Brain::Snapshot.where(account_id: current_account.id).count

    render json: {
      data: events,
      meta: { page: page, per_page: PAGE_SIZE, count: events.size, total_count: total_count }
    }, status: :ok
  end

  private

  def build_timeline_events(account_id, page:)
    offset = (page - 1) * PAGE_SIZE

    # Snapshots: brain grew (capture / upload / adjustment / cron)
    snapshot_events = snapshot_page(account_id, offset).map { |s| snapshot_to_event(s) }

    # Ingestion logs: individual conversation captures (success only).
    # Included on the first page only to avoid double-pagination complexity.
    # A proper merged-stream with cursor pagination is a post-Day-1 evolution.
    ingestion_events = page == 1 ? recent_ingestion_events(account_id) : []

    merge_events(snapshot_events, ingestion_events)
  end

  def snapshot_page(account_id, offset)
    Algorythmo::Brain::Snapshot
      .where(account_id: account_id)
      .order(taken_at: :desc)
      .limit(PAGE_SIZE)
      .offset(offset)
  end

  def recent_ingestion_events(account_id)
    Algorythmo::Brain::IngestionLog
      .where(account_id: account_id, outcome: :success)
      .order(brain_indexed_at: :desc)
      .limit(10)
      .map { |log| ingestion_to_event(log) }
  end

  # Merges two pre-sorted event arrays into a single newest-first list.
  # Keeps at most PAGE_SIZE items total.
  def merge_events(snapshot_events, ingestion_events)
    (snapshot_events + ingestion_events)
      .sort_by { |e| e[:occurred_at] }
      .reverse
      .first(PAGE_SIZE)
  end

  def snapshot_to_event(snapshot)
    {
      id: "snapshot-#{snapshot.id}",
      type: 'snapshot',
      occurred_at: snapshot.taken_at.iso8601,
      summary: snapshot.diff_summary || 'Brain snapshot recorded',
      trigger: snapshot.trigger,
      meta: snapshot.stats.slice('pages', 'page_count', 'edges', 'edge_count')
    }
  end

  def ingestion_to_event(log)
    {
      id: "ingestion-#{log.id}",
      type: 'conversation_ingested',
      occurred_at: (log.brain_indexed_at || log.created_at).iso8601,
      summary: "Conversation ##{log.conversation_id} indexed into Brain",
      trigger: 'cron',
      meta: { conversation_id: log.conversation_id, page_path: log.brain_page_path }
    }
  end
end
