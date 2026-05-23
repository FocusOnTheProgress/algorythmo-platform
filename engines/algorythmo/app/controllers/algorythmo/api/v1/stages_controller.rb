# frozen_string_literal: true

module Algorythmo
  module Api
    module V1
      # StagesController — rename and update aging_coefficient for CRM stages.
      #
      # A.8 — PATCH /algorythmo/api/v1/accounts/:account_id/stages/:id/rename
      # A.6b — PATCH /algorythmo/api/v1/accounts/:account_id/stages/:id (aging_coefficient)
      class StagesController < BaseController
        before_action :set_stage

        # PATCH /algorythmo/api/v1/accounts/:account_id/stages/:id
        # Accepts: { stage: { aging_coefficient: 4.0 } }
        def update
          coef = params.dig(:stage, :aging_coefficient)
          if coef.nil?
            render json: { error: 'aging_coefficient is required' }, status: :unprocessable_entity
            return
          end

          if @stage.update_aging_coefficient(coef)
            render json: stage_json(@stage)
          else
            render json: { errors: @stage.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PATCH /algorythmo/api/v1/accounts/:account_id/stages/:id/rename
        # Accepts: { name: "Orçamento enviado" }
        def rename
          new_name = params[:name]
          if new_name.blank?
            render json: { error: 'name is required' }, status: :unprocessable_entity
            return
          end

          if @stage.rename(new_name)
            render json: stage_json(@stage)
          else
            render json: { errors: @stage.errors.full_messages }, status: :unprocessable_entity
          end
        end

        private

        def set_stage
          pipeline = Algorythmo::Pipeline.find_by!(account: current_account)
          @stage   = pipeline.stages.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: 'Stage not found' }, status: :not_found
        end

        def stage_json(stage)
          {
            id:                 stage.id,
            pipeline_id:        stage.pipeline_id,
            name:               stage.name,
            position:           stage.position,
            kind:               stage.kind,
            aging_coefficient:  stage.aging_coefficient,
            created_at:         stage.created_at,
            updated_at:         stage.updated_at
          }
        end
      end
    end
  end
end
