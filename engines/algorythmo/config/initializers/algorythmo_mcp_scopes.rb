# frozen_string_literal: true

# MCP OAuth-style operation scopes (D-A4).
#
# These are operation-level scopes on the GBrain brain — NOT row-level account
# partitioning. Multi-account isolation (M3.5) is achieved via separate brain
# instances (brain-per-account via GBRAIN_DATABASE_URL, ADR-0014), not scope claims.
#
# Usage:
#   scope = Algorythmo::McpScopes::READ_TRUTH
#   Algorythmo::McpScopes::ALL.include?(scope)  # => true
module Algorythmo
  module McpScopes
    READ_TRUTH    = 'read:truth'
    READ_TIMELINE = 'read:timeline'
    WRITE_CAPTURE = 'write:capture'
    ADMIN         = 'admin'

    ALL = [READ_TRUTH, READ_TIMELINE, WRITE_CAPTURE, ADMIN].freeze
  end
end
