# frozen_string_literal: true

require 'spec_helper'

# M0.5 — Telemetry migration tests
RSpec.describe 'Algorythmo M0 migrations', type: :model do
  describe 'accounts table' do
    it 'has telemetry_consent column with default false' do
      account = build(:account)
      expect(account).to respond_to(:telemetry_consent)
      expect(account.telemetry_consent).to eq(false)
    end

    it 'telemetry_consent is not null' do
      column = Account.columns.find { |c| c.name == 'telemetry_consent' }
      expect(column).not_to be_nil
      expect(column.null).to eq(false)
    end
  end

  describe 'telemetry_events table' do
    it 'exists in the database' do
      expect(ActiveRecord::Base.connection.table_exists?(:telemetry_events)).to eq(true)
    end

    it 'has required columns' do
      columns = ActiveRecord::Base.connection.columns(:telemetry_events).map(&:name)
      expect(columns).to include('account_id', 'event_type', 'payload', 'created_at')
    end

    it 'has no rows (placeholder — no collection in M0)' do
      expect(ActiveRecord::Base.connection.select_value('SELECT COUNT(*) FROM telemetry_events').to_i).to eq(0)
    end
  end
end
