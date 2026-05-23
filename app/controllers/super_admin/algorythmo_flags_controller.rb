# frozen_string_literal: true

# Manages Algorythmo OS per-account cut flags via the super-admin UI.
# Flags live in accounts.algorythmo_feature_flags (dedicated bigint column),
# isolated from Chatwoot's upstream feature_flags column.
class SuperAdmin::AlgorythmoFlagsController < SuperAdmin::ApplicationController
  before_action :find_account

  def show; end

  def update
    Algorythmo::FeatureFlagBits::CUT_FLAG_NAMES.each do |flag|
      enabled = params.dig(:algorythmo_flags, flag) == '1'
      @account.send(:"algorythmo_cut_#{flag}=", enabled)
    end

    if @account.save
      redirect_to super_admin_account_algorythmo_flags_path(@account),
                  notice: 'Algorythmo flags updated.'
    else
      flash.now[:error] = @account.errors.full_messages.to_sentence
      render :show, status: :unprocessable_entity
    end
  end

  private

  def find_account
    @account = Account.find(params[:account_id])
  end
end
