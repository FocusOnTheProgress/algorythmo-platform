# frozen_string_literal: true

module Algorythmo
  class Stage < ApplicationRecord
    belongs_to :pipeline, class_name: 'Algorythmo::Pipeline', touch: true
    has_many :leads, class_name: 'Algorythmo::Lead', foreign_key: :stage_id,
                     inverse_of: :stage, dependent: :nullify

    enum kind: { open: 0, won: 1, lost: 2 }

    validates :name,              presence: true
    validates :position,          presence: true, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
    validates :aging_coefficient, presence: true, numericality: { greater_than_or_equal_to: 0.0 }
    validates :name, uniqueness: { scope: :pipeline_id, case_sensitive: false }

    # A.6 — rename with validation: non-blank, non-duplicate within pipeline.
    def rename(new_name)
      new_name = new_name.to_s.strip
      errors.add(:name, :blank) and return false if new_name.blank?

      duplicate = pipeline.stages.where.not(id: id).where('LOWER(name) = LOWER(?)', new_name).exists?
      errors.add(:name, :taken) and return false if duplicate

      update(name: new_name)
    end

    # A.6b — update aging coefficient (D10).
    def update_aging_coefficient(coef)
      coef = coef.to_f
      if coef < 0
        errors.add(:aging_coefficient, :greater_than_or_equal_to, count: 0)
        return false
      end

      update(aging_coefficient: coef)
    end
  end
end
