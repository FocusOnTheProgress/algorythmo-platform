# frozen_string_literal: true

# PipelineMetricsController — funnel observability for the Kanban surface.
#
# M1-D: the Kanban hoje renderiza leads mas nao responde "onde a venda trava".
# Esta rota expoe os indicadores agregados que o KanbanHeader + chips por
# estagio consomem (CONTRACT_M1B §2 v1.2.0 + §9).
#
# Scoping: only the current_account's pipeline is reachable; cross-account
# requests resolve to 404 (not 403) so an attacker probing for valid pipeline
# IDs cannot distinguish "pipeline exists, you cannot see it" from "pipeline
# does not exist". The Algorythmo::Api::V1::BaseController before_action
# already enforces the algorythmo_crm cut flag.
class Algorythmo::Api::V1::PipelineMetricsController < Algorythmo::Api::V1::BaseController
  before_action :set_pipeline

  # GET /algorythmo/api/v1/accounts/:account_id/pipelines/:id/metrics
  def show
    payload = Algorythmo::Analytics::PipelineMetrics
              .new(account: current_account, pipeline: @pipeline)
              .call
    render json: payload
  end

  private

  def set_pipeline
    @pipeline = Algorythmo::Pipeline.find_by(account_id: current_account.id, id: params[:id])
    render json: { error: 'Pipeline not found' }, status: :not_found unless @pipeline
  end
end
