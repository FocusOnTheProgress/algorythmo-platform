# frozen_string_literal: true

# Dynamic Client Registration (RFC 7591) scaffold for MCP HTTP transport (M3-late).
#
# Status: SCAFFOLDED — gated behind ENV flag ALGORYTHMO_MCP_HTTP_ENABLED.
#   OFF (default, Day-1): returns 404. Stdio MCP is the active transport (D-A4).
#   ON  (M3.5+):          registers an OAuth client for a new MCP HTTP session.
#
# Activation path (ADR-0014):
#   Brain-per-account via GBRAIN_DATABASE_URL is the M3.5 architecture. When that
#   ships, set ENV['ALGORYTHMO_MCP_HTTP_ENABLED']='true' and implement register_client.
#   HTTP+OAuth+DCR replaces stdio for Manu agent connections.
#
# Why ENV and not FeatureGate cut_enabled?:
#   DCR is a per-deployment infrastructure toggle, not a per-account feature flag.
#   Per-account DCR makes no sense (clients register against the server, not an account).
#   ENV var = operator-level switch, appropriate for protocol transport selection.
#
# Route: POST /algorythmo/oauth/clients
#   Wired in engines/algorythmo/config/routes.rb.
class Algorythmo::Oauth::DcrController < Algorythmo::ApplicationController
  before_action :gate_mcp_http_feature!

  # POST /algorythmo/oauth/clients
  def create
    # M3.5 implementation goes here:
    #   1. Validate RFC 7591 registration request params.
    #   2. Generate client_id + client_secret.
    #   3. Persist to algorythmo_oauth_clients table.
    #   4. Return registration response per RFC 7591 §3.2.1.
    #
    # Today: render 200 stub so the flag-ON path has a valid response in specs.
    render json: { status: 'dcr_stub', message: 'M3.5 implementation pending' }, status: :ok
  end

  private

  def gate_mcp_http_feature!
    enabled = ActiveModel::Type::Boolean.new.cast(
      ENV.fetch('ALGORYTHMO_MCP_HTTP_ENABLED', 'false')
    )
    render_not_found unless enabled
  end

  def render_not_found
    render json: { error: 'Not found' }, status: :not_found
  end
end
