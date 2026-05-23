# frozen_string_literal: true

class Algorythmo::ApplicationRecord < ActiveRecord::Base
  self.abstract_class = true

  # Engine models live in the `algorythmo_*` table namespace by convention.
  # Override table_name_prefix so AR resolves e.g. Algorythmo::Pipeline → algorythmo_pipelines.
  def self.table_name_prefix
    'algorythmo_'
  end
end
