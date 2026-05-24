# frozen_string_literal: true

# Base for all Algorythmo CRM API controllers.
# Inherits authentication from the host Api::V1::Accounts::BaseController
# so we get access token auth, current_account, and locale switching for free.
class Algorythmo::Api::V1::BaseController < Api::V1::Accounts::BaseController
  # algorythmo: feature-gate algorythmo_crm
  # All CRM endpoints are fail-closed behind this flag.
  before_action :ensure_algorythmo_crm_enabled!

  private

  def ensure_algorythmo_crm_enabled!
    return if Algorythmo::FeatureGate.cut_enabled?(current_account, 'crm')

    render json: { error: 'Feature not enabled' }, status: :forbidden
  end
end
