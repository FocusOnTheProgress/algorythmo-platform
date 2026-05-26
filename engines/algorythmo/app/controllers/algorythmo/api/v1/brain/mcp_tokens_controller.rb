# frozen_string_literal: true

# Stub — implementation in T3 (PR M3-6).
# POST /brain/mcp_token returns { token, token_file_path, command, expires_at, mode }.
# Token is NEVER returned in a CLI arg or logged.
class Algorythmo::Api::V1::Brain::McpTokensController < Algorythmo::Api::V1::Brain::BaseController
  def create
    head :not_implemented
  end
end
