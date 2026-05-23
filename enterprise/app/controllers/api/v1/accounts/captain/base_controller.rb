# frozen_string_literal: true

# algorythmo: feature-gate algorythmo_show_captain
# Base controller for all Captain API endpoints.
# Applies the Algorythmo OS feature gate so every Captain controller
# returns 403 when the flag is off — without each subclass needing to
# repeat the check.
#
# Auth + account scoping are inherited from Api::V1::Accounts::BaseController
# (current_account before_action) so subclasses only define their own logic.
class Api::V1::Accounts::Captain::BaseController < Api::V1::Accounts::BaseController
  include Algorythmo::FeatureGate::ControllerConcern
end
