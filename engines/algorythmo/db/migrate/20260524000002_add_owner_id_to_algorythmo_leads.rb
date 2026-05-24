# frozen_string_literal: true

class AddOwnerIdToAlgorythmoLeads < ActiveRecord::Migration[7.1]
  def change
    add_reference :algorythmo_leads, :owner,
                  null: true,
                  foreign_key: { to_table: :users, on_delete: :nullify },
                  index: { name: 'idx_algorythmo_leads_on_owner_id' }
  end
end
