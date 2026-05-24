# frozen_string_literal: true

class AddAlgorythmoFeatureFlagsToAccounts < ActiveRecord::Migration[7.1]
  def change
    add_column :accounts, :algorythmo_feature_flags, :bigint, default: 0, null: false
  end
end
