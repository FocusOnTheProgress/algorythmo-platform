# frozen_string_literal: true

# Stub — implementation in T3 (PR M3-6).
# DELETE /brain/mcp_sessions revokes all active sessions for the current user
# and performs best-effort Redis DEL. 5-min cache window documented in D-A5.
class Algorythmo::Api::V1::Brain::McpSessionsController < Algorythmo::Api::V1::Brain::BaseController
  def destroy
    head :not_implemented
  end
end
