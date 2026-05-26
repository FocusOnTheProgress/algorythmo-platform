# frozen_string_literal: true

# Base controller for all Brain API endpoints.
#
# Auth chain (5 levels — must be preserved, never bypass):
#   1. Api::BaseController            → authenticate_access_token! (or authenticate_user!)
#   2. Api::V1::Accounts::BaseController → current_account + AccountUser membership
#   3. Algorythmo::Api::V1::BaseController → ensure_algorythmo_crm_enabled! (feature gate)
#   4. Algorythmo::Api::V1::Brain::BaseController (this class)
#   5. Algorythmo::Brain::TenantResolution#resolve_tenant! → Day-1 primary-account guard
#
# All Brain controllers inherit from here. Do NOT include TenantResolution elsewhere.
class Algorythmo::Api::V1::Brain::BaseController < Algorythmo::Api::V1::BaseController
  include Algorythmo::Brain::TenantResolution
end
