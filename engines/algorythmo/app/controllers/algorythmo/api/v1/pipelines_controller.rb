# frozen_string_literal: true

# PipelinesController — read-only access to the default pipeline + its stages.
#
# B.0 — precondition for the Kanban frontend (Trilha B).
# The Kanban board needs to know the 5 stage definitions before it can render
# columns. Rather than hard-coding stage names in the frontend, this endpoint
# returns the pipeline record + ordered stages so the client stays data-driven.
class Algorythmo::Api::V1::PipelinesController < Algorythmo::Api::V1::BaseController
  # GET /algorythmo/api/v1/accounts/:account_id/pipelines/default
  #
  # Returns the default pipeline for the current account together with its stages
  # ordered by position. Uses Pipeline.cached_default_for to avoid a DB hit on
  # every Kanban load — the cache busts automatically when pipeline or stages change.
  #
  # Response: { pipeline: {id, name}, stages: [{id, name, position, kind, aging_coefficient}] }
  def default
    pipeline = Algorythmo::Pipeline.cached_default_for(current_account)

    return render json: { error: 'No pipeline configured' }, status: :not_found unless pipeline

    render json: {
      pipeline: { id: pipeline.id, name: pipeline.name },
      stages: pipeline.stages.order(:position).map do |s|
        {
          id: s.id,
          name: s.name,
          position: s.position,
          kind: s.kind,
          aging_coefficient: s.aging_coefficient
        }
      end
    }
  end
end
