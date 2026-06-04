# frozen_string_literal: true

# GET /algorythmo/api/v1/accounts/:account_id/brain/compiled_truth
#
# Returns a real "knowledge overview" from the gbrain motor via Client#stats.
# Read-only — no WriteLock, no LLM. Auth + tenant isolation are fully handled
# by the inherited Brain::BaseController chain (5 levels, includes TenantResolution).
#
# Response shape (200):
#   {
#     "pages":      Integer,   # total pages in the brain (0 when empty — never an error)
#     "edges":      Integer,   # graph edges / links between pages (0 when empty)
#     "raw_stats":  Hash,      # full parsed output of `gbrain stats` for transparency
#     "account_id": Integer    # the account whose brain was queried
#   }
#
# Error responses:
#   502 — gbrain subprocess failed or timed out (typed body: { "error": "..." })
#   All other errors (auth, tenant) handled upstream — this action never returns 500.
class Algorythmo::Api::V1::Brain::CompiledTruthController < Algorythmo::Api::V1::Brain::BaseController
  def show
    client = Algorythmo::Brain::Client.new(current_account.id)
    raw    = client.stats

    render json: build_response(raw, current_account.id)
  rescue Algorythmo::Brain::Client::SubprocessError,
         Algorythmo::Brain::Client::TimeoutError => e
    render json: { error: e.message }, status: :bad_gateway
  end

  private

  # Maps the raw `gbrain stats` hash to a clean, stable shape.
  # Falls back to 0 for missing keys so an empty brain never raises.
  def build_response(raw, account_id)
    aggregate = raw.is_a?(Hash) ? (raw['aggregate'] || {}) : {}

    {
      pages: Integer(aggregate['total_pages'] || 0),
      edges: Integer(aggregate['total_edges'] || 0),
      raw_stats: raw,
      account_id: account_id
    }
  end
end
