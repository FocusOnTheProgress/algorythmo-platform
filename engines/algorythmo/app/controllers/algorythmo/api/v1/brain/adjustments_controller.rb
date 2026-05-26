# frozen_string_literal: true

# Stub — implementation in T1 (PR M3-5).
# POST /brain/adjustments enqueues IngestionWorker (NOT foreground gbrain call).
# Write is serialised via queue + WriteLock inside the worker.
class Algorythmo::Api::V1::Brain::AdjustmentsController < Algorythmo::Api::V1::Brain::BaseController
  def create
    head :not_implemented
  end
end
