# frozen_string_literal: true

require 'rails_helper'

# M0.5 — Telemetry migration tests
RSpec.describe 'Algorythmo M0 migrations', type: :model do
  describe 'accounts table' do
    it 'has telemetry_consent column with default false' do
      account = build(:account)
      expect(account).to respond_to(:telemetry_consent)
      expect(account.telemetry_consent).to be(false)
    end

    it 'telemetry_consent is not null' do
      column = Account.columns.find { |c| c.name == 'telemetry_consent' }
      expect(column).not_to be_nil
      expect(column.null).to be(false)
    end
  end

  describe 'telemetry_events table' do
    it 'exists in the database' do
      expect(ActiveRecord::Base.connection.table_exists?(:telemetry_events)).to be(true)
    end

    it 'has required columns' do
      columns = ActiveRecord::Base.connection.columns(:telemetry_events).map(&:name)
      expect(columns).to include('account_id', 'event_type', 'payload', 'created_at')
    end

    it 'has no rows (placeholder — no collection in M0)' do
      expect(ActiveRecord::Base.connection.select_value('SELECT COUNT(*) FROM telemetry_events').to_i).to eq(0)
    end
  end

  # Plan 0012 PR3 — brain document upload pipeline table.
  describe 'algorythmo_brain_documents table' do
    it 'exists in the database' do
      expect(ActiveRecord::Base.connection.table_exists?(:algorythmo_brain_documents)).to be(true)
    end

    it 'has the columns the pipeline relies on' do
      columns = ActiveRecord::Base.connection.columns(:algorythmo_brain_documents).map(&:name)
      expect(columns).to include(
        'account_id', 'user_id', 'filename', 'content_type', 'byte_size',
        'category', 'status', 'brain_page_path', 'last_error'
      )
    end

    it 'indexes (account_id, status) for the paginated listing' do
      indexes = ActiveRecord::Base.connection.indexes(:algorythmo_brain_documents)
      expect(indexes.map(&:columns)).to include(%w[account_id status])
    end
  end
end
