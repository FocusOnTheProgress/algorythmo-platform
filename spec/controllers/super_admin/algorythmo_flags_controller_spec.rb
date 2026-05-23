# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'SuperAdmin::AlgorythmoFlagsController', type: :request do
  let!(:super_admin) { create(:super_admin) }
  let!(:account) { create(:account) }

  describe 'GET /super_admin/accounts/:account_id/algorythmo_flags' do
    context 'when unauthenticated' do
      it 'redirects to sign in' do
        get "/super_admin/accounts/#{account.id}/algorythmo_flags"
        expect(response).to have_http_status(:redirect)
      end
    end

    context 'when authenticated' do
      before { sign_in(super_admin, scope: :super_admin) }

      it 'renders the flags form' do
        get "/super_admin/accounts/#{account.id}/algorythmo_flags"
        expect(response).to have_http_status(:success)
        expect(response.body).to include('algorythmo_flags[campaigns]')
        expect(response.body).to include('Update Algorythmo Flags')
      end

      it 'shows all 13 cut flags' do
        get "/super_admin/accounts/#{account.id}/algorythmo_flags"
        Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES.each do |flag|
          expect(response.body).to include("algorythmo_flags[#{flag}]")
        end
      end
    end
  end

  describe 'PATCH /super_admin/accounts/:account_id/algorythmo_flags' do
    context 'when unauthenticated' do
      it 'redirects to sign in' do
        patch "/super_admin/accounts/#{account.id}/algorythmo_flags"
        expect(response).to have_http_status(:redirect)
      end
    end

    context 'when authenticated' do
      before { sign_in(super_admin, scope: :super_admin) }

      it 'enables a flag when checked' do
        patch "/super_admin/accounts/#{account.id}/algorythmo_flags",
              params: { algorythmo_flags: { 'campaigns' => '1' } }

        expect(account.reload.algorythmo_cut_enabled?('campaigns')).to be true
        expect(response).to redirect_to(
          super_admin_account_algorythmo_flags_path(account)
        )
      end

      it 'disables a flag when unchecked (absent from params)' do
        account.algorythmo_cut_campaigns = true
        account.save!

        patch "/super_admin/accounts/#{account.id}/algorythmo_flags",
              params: { algorythmo_flags: {} }

        expect(account.reload.algorythmo_cut_enabled?('campaigns')).to be false
      end

      it 'does not affect other accounts' do
        other_account = create(:account)
        patch "/super_admin/accounts/#{account.id}/algorythmo_flags",
              params: { algorythmo_flags: { 'campaigns' => '1' } }

        expect(other_account.reload.algorythmo_cut_enabled?('campaigns')).to be false
      end

      it 'migration rollback: new column defaults to 0' do
        expect(account.algorythmo_feature_flags).to eq(0)
      end
    end
  end
end
