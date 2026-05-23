# frozen_string_literal: true

FactoryBot.define do
  factory :algorythmo_stage, class: 'Algorythmo::Stage' do
    association :pipeline, factory: :algorythmo_pipeline
    sequence(:name) { |n| "Stage #{n}" }
    sequence(:position)
    kind { :open }
    aging_coefficient { 1.0 }
  end
end
