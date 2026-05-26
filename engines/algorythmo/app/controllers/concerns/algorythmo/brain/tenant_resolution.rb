# frozen_string_literal: true

# Controller concern that enforces Brain tenant authorization as defense-in-depth.
#
# Why a controller concern, NOT Rack middleware:
#   Chatwoot auth lives in controller before_actions (Api::BaseController#authenticate_access_token!,
#   Api::V1::Accounts::BaseController#current_account). Rack runs at step 0 — before any controller
#   code — so Current.user / Current.account are nil in Rack time. This concern runs AFTER the
#   Chatwoot chain completes, making Current.account available for validation.
#   Confirmed by spike-runtime-validation (docs/algorythmo/M3-brain/spike-runtime-validation.md §1.1).
#
# Before-action order (5 levels):
#   1. Api::BaseController#authenticate_access_token!   → Current.user (auth)
#   2. Api::V1::Accounts::BaseController#current_account → Current.account + AccountUser check
#   3. Algorythmo::Api::V1::BaseController#ensure_algorythmo_crm_enabled! → feature gate
#   4. (Brain::BaseController includes this concern)
#   5. resolve_tenant! → Day-1 guard + Sentry tags
#
# Day-1: validates current_account.id == ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence.
#   ENV unset  → 403 + Rails.logger.error (NEVER 500 via ENV.fetch).
#   ID mismatch → 403 fail-closed.
#
# M3.5: generalize to AccountBrainRegistry.lookup(current_account.id) per ADR-0015.
module Algorythmo::Brain::TenantResolution
  extend ActiveSupport::Concern

  included do
    # algorythmo: brain-gate
    # Runs AFTER current_account is set by the Chatwoot auth chain.
    before_action :resolve_tenant!
  end

  private

  def resolve_tenant!
    # Defensive nil guard: current_account is set by the Chatwoot before_action chain.
    # If a subclass misconfigures the chain and skips current_account, we get nil here.
    # Fail 403 (not 500) — never NoMethodError, per concern contract.
    if current_account.nil?
      Rails.logger.error('[Algorythmo::Brain] current_account nil at resolve_tenant! — chain misconfigured')
      head :forbidden
      return
    end

    primary_id = ENV['ALGORYTHMO_PRIMARY_ACCOUNT_ID'].presence

    if primary_id.nil?
      # ENV unset is a misconfiguration, not a user error. Log loudly, return 403 fail-closed.
      # Using .presence (not ENV.fetch) so missing key never raises KeyError → 500.
      Rails.logger.error(
        '[Algorythmo::Brain] ALGORYTHMO_PRIMARY_ACCOUNT_ID not set — ' \
        'all Brain requests are blocked until env is configured'
      )
      head :forbidden
      return
    end

    unless current_account.id.to_s == primary_id.to_s
      Rails.logger.error(
        "[Algorythmo::Brain] Account ID mismatch: " \
        "request account=#{current_account.id} primary=#{primary_id}"
      )
      head :forbidden
      return
    end

    tag_sentry_context
  end

  def tag_sentry_context
    return unless defined?(Sentry)

    Sentry.configure_scope do |scope|
      scope.set_tags(
        account_id: current_account.id,
        user_id: current_user&.id
      )
    end
  end
end
