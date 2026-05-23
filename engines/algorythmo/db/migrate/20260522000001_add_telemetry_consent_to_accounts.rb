# frozen_string_literal: true

# algorythmo: telemetry-placeholder-a5
# Adds telemetry_consent to accounts — placeholder per ADR-0007 + decision A5.
# No data is collected in M0. Consent is opt-in (default false).
# Actual telemetry collection scheduled post-MVP.
class AddTelemetryConsentToAccounts < ActiveRecord::Migration[7.1]
  def change
    add_column :accounts, :telemetry_consent, :boolean, default: false, null: false
  end
end
