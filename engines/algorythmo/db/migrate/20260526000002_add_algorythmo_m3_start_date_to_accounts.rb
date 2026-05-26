# frozen_string_literal: true

# Adds algorythmo_m3_start_date to accounts.
#
# This column marks the Day-1 of the Brain MVP for each account.
# The ingestion worker uses it as a forward-only gate: only conversations
# created after this date are eligible for ingestion (D-ING — no backfill).
#
# Default: the migration timestamp (Time.current at deployment time).
# All accounts that existed before M3 activation get the deployment time as
# their start date, so no historical conversation is retroactively pulled in.
# The founder can override this value via console/seeds to change the window.
class AddAlgorythmoM3StartDateToAccounts < ActiveRecord::Migration[7.1]
  def change
    add_column :accounts, :algorythmo_m3_start_date, :datetime,
               null: false,
               default: -> { 'NOW()' }
  end
end
