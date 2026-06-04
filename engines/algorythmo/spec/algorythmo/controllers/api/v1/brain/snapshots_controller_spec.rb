# frozen_string_literal: true

require 'rails_helper'

# Contract for Algorythmo::Api::V1::Brain::SnapshotsController#index:
#   - Authenticated founder (ENV match) → 200 + paginated list
#   - Non-founder account → 403 fail-closed
#   - Brain with no snapshots → 200 + empty data array (honest empty-state)
#   - Pagination works (?page=2)
#   - Shape: { data: [...], meta: { page, per_page, count } }
#   - This action is read-only — never touches gbrain subprocess
RSpec.describe Algorythmo::Api::V1::Brain::SnapshotsController, type: :request do
  let(:account) { create(:account) }
  let(:admin)   { create(:user, account: account, role: :administrator) }
  let(:headers) { { 'api_access_token' => admin.access_token.token } }

  let(:base_path) { "/algorythmo/api/v1/accounts/#{account.id}/brain/snapshots" }

  def make_snapshot(account:, taken_at: Time.current, trigger: 'cron', stats: {}, diff_summary: nil)
    Algorythmo::Brain::Snapshot.create!(
      account: account,
      taken_at: taken_at,
      stats: stats,
      diff_summary: diff_summary,
      trigger: trigger
    )
  end

  before do
    allow(Algorythmo::FeatureGate).to receive(:cut_enabled?).and_return(true)
    allow(ENV).to receive(:[]).and_call_original
    allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID').and_return(account.id.to_s)
  end

  # ---------------------------------------------------------------------------
  # 403 fail-closed for non-founder
  # ---------------------------------------------------------------------------
  context 'when the requesting account does not match ALGORYTHMO_PRIMARY_ACCOUNT_ID' do
    let(:other_account) { create(:account) }

    before do
      allow(ENV).to receive(:[]).with('ALGORYTHMO_PRIMARY_ACCOUNT_ID')
                                .and_return(other_account.id.to_s)
    end

    it 'returns 403' do
      get base_path, headers: headers
      expect(response).to have_http_status(:forbidden)
    end
  end

  # ---------------------------------------------------------------------------
  # Empty brain — honest empty-state
  # ---------------------------------------------------------------------------
  context 'when the account has no snapshots' do
    it 'returns 200 with an empty data array' do
      get base_path, headers: headers
      expect(response).to have_http_status(:ok)

      body = JSON.parse(response.body)
      expect(body['data']).to eq([])
      expect(body['meta']['count']).to eq(0)
      expect(body['meta']['total_count']).to eq(0)
    end
  end

  # ---------------------------------------------------------------------------
  # Non-empty — shape and ordering
  # ---------------------------------------------------------------------------
  context 'when the account has snapshots' do
    let!(:older_snapshot) { make_snapshot(account: account, taken_at: 2.hours.ago, stats: { 'pages' => 2 }, trigger: 'cron') }
    let!(:newer_snapshot) { make_snapshot(account: account, taken_at: 1.hour.ago,  stats: { 'pages' => 3 }, trigger: 'upload') }

    it 'returns 200' do
      get base_path, headers: headers
      expect(response).to have_http_status(:ok)
    end

    it 'returns snapshots newest-first' do
      get base_path, headers: headers
      ids = JSON.parse(response.body)['data'].map { |s| s['id'] }
      expect(ids.first).to eq(newer_snapshot.id)
      expect(ids.last).to  eq(older_snapshot.id)
    end

    it 'includes the required shape keys' do
      get base_path, headers: headers
      item = JSON.parse(response.body)['data'].first

      aggregate_failures do
        expect(item).to have_key('id')
        expect(item).to have_key('account_id')
        expect(item).to have_key('taken_at')
        expect(item).to have_key('stats')
        expect(item).to have_key('diff_summary')
        expect(item).to have_key('trigger')
        expect(item).to have_key('created_at')
      end
    end

    it 'does not return snapshots from a different account' do
      other_account  = create(:account)
      other_snapshot = make_snapshot(account: other_account, trigger: 'cron')

      get base_path, headers: headers
      ids = JSON.parse(response.body)['data'].map { |s| s['id'] }

      expect(ids).not_to include(other_snapshot.id)
    end
  end

  # ---------------------------------------------------------------------------
  # Pagination
  # ---------------------------------------------------------------------------
  context 'pagination' do
    before do
      # Create 25 snapshots (PAGE_SIZE=20 → first page has 20, second has 5)
      25.times do |i|
        make_snapshot(account: account, taken_at: i.hours.ago, trigger: 'cron')
      end
    end

    it 'returns at most PAGE_SIZE items on page 1' do
      get base_path, headers: headers
      body = JSON.parse(response.body)
      expect(body['data'].size).to eq(20)
      expect(body['meta']['page']).to eq(1)
      expect(body['meta']['total_count']).to eq(25)
    end

    it 'returns the remainder on page 2' do
      get "#{base_path}?page=2", headers: headers
      body = JSON.parse(response.body)
      expect(body['data'].size).to eq(5)
      expect(body['meta']['page']).to eq(2)
    end
  end
end
