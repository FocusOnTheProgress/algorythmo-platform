# frozen_string_literal: true

# Mixin for API controllers that sit behind the algorythmo_show_captain gate.
# Include this concern and the before_action fires automatically.
#
# Usage:
#   class MyController < Api::V1::Accounts::Captain::BaseController
#     # Gate is already applied via BaseController — no extra steps needed.
#   end
module Algorythmo::FeatureGate::ControllerConcern
  extend ActiveSupport::Concern

  included do
    # algorythmo: feature-gate algorythmo_show_captain
    before_action :ensure_algorythmo_show_captain_enabled!
  end

  private

  def ensure_algorythmo_show_captain_enabled!
    return if Algorythmo::FeatureGate.feature_enabled?(Current.account, 'algorythmo_show_captain')

    render json: { error: 'Feature not enabled' }, status: :forbidden
  end
end
