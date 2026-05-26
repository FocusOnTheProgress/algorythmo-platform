# frozen_string_literal: true

require 'fileutils'

# POST /brain/mcp_token
#
# Issues a new MCP bearer token, writes it to a 0600 file at
# ~/.algorythmo/mcp/token-<session_id>, and returns:
#   { token_file_path:, command:, expires_at:, mode: "stdio" }
#
# Security invariants (D-A5):
#   - Raw token is NEVER returned in the JSON body.
#   - Raw token is NEVER in the gbrain CLI arg (gbrain reads --auth-file, not --auth).
#   - File is created with mode 0600 before the token is written.
#   - If chmod fails, the file is removed and the request fails 500 — fail-closed.
class Algorythmo::Api::V1::Brain::McpTokensController < Algorythmo::Api::V1::Brain::BaseController
  def create
    scope = params[:scope].presence || Algorythmo::McpScopes::READ_TRUTH

    unless Algorythmo::McpScopes::ALL.include?(scope)
      render json: { error: "Invalid scope: #{scope}" }, status: :unprocessable_entity
      return
    end

    result = Algorythmo::Brain::McpTokenIssuer.call(
      user:    current_user,
      account: current_account,
      scope:   scope
    )

    write_token_file!(result[:token_file_path], result[:token])

    render json: {
      token_file_path: result[:token_file_path],
      command:         result[:command],
      expires_at:      result[:expires_at].iso8601,
      mode:            'stdio'
    }, status: :created
  end

  private

  def write_token_file!(path, token)
    dir = File.dirname(path)
    FileUtils.mkdir_p(dir, mode: 0o700)

    # Create the file with restrictive permissions BEFORE writing the secret.
    # If chmod raises (e.g., unsupported filesystem), the file is removed and
    # the request fails — fail-closed to prevent world-readable token files.
    File.open(path, 'w') do |f|
      f.chmod(0o600)
      f.write(token)
    end
  rescue StandardError => e
    FileUtils.rm_f(path)
    raise e
  end
end
