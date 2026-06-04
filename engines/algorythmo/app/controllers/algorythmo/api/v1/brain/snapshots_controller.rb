# frozen_string_literal: true

# GET /algorythmo/api/v1/accounts/:account_id/brain/snapshots
#
# Returns a paginated list of brain snapshots for the account, most-recent first.
# Auth chain inherited from Brain::BaseController (5 levels, fail-closed).
#
# Shape per item:
#   { id, account_id, taken_at, stats, diff_summary, trigger, created_at }
#
# Pagination: ?page=N (1-based, 20 per page).  Empty brain = [] (honest empty-state).
# gbrain error during a *future* snapshot creation = 502, never 500 (handled in worker).
# This action is read-only — it never touches the brain subprocess.
class Algorythmo::Api::V1::Brain::SnapshotsController < Algorythmo::Api::V1::Brain::BaseController
  PAGE_SIZE = 20

  def index
    page      = [params.fetch(:page, 1).to_i, 1].max
    offset    = (page - 1) * PAGE_SIZE
    snapshots = page_of_snapshots(current_account.id, offset)

    render json: {
      data: snapshots.map { |s| serialize_snapshot(s) },
      meta: { page: page, per_page: PAGE_SIZE, count: snapshots.size }
    }, status: :ok
  end

  private

  def page_of_snapshots(account_id, offset)
    Algorythmo::Brain::Snapshot
      .where(account_id: account_id)
      .order(taken_at: :desc)
      .offset(offset)
      .limit(PAGE_SIZE)
  end

  def serialize_snapshot(snapshot)
    {
      id: snapshot.id,
      account_id: snapshot.account_id,
      taken_at: snapshot.taken_at.iso8601,
      stats: snapshot.stats,
      diff_summary: snapshot.diff_summary,
      trigger: snapshot.trigger,
      created_at: snapshot.created_at.iso8601
    }
  end
end
