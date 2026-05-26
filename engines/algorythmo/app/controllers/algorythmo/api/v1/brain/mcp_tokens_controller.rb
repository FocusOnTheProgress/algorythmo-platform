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
      user: current_user,
      account: current_account,
      scope: scope
    )

    write_token_file!(result[:token_file_path], result[:token])

    render json: {
      token_file_path: result[:token_file_path],
      command: result[:command],
      expires_at: result[:expires_at].iso8601,
      mode: 'stdio'
    }, status: :created
  end

  private

  def write_token_file!(path, token)
    dir = File.dirname(path)
    FileUtils.mkdir_p(dir, mode: 0o700)

    # Atomically create with 0600 so no window exists during which the file
    # is world-readable (a separate File.open + f.chmod would create at umask
    # default and only narrow permissions after the inode existed). The mode
    # arg to open(2) is honored at creation time — the file never appears
    # with looser permissions even for a microsecond. Fail-closed: any error
    # removes the file before propagating.
    File.umask(0o077).tap do |prev_umask|
      begin
        File.open(path, File::WRONLY | File::CREAT | File::TRUNC, 0o600) do |f|
          f.write(token)
        end
      ensure
        File.umask(prev_umask)
      end
    end
  rescue StandardError => e
    FileUtils.rm_f(path)
    raise e
  end
end
