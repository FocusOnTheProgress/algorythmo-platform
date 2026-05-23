# frozen_string_literal: true

FactoryBot.define do
  factory :algorythmo_lead, class: 'Algorythmo::Lead' do
    account
    contact
    association :stage, factory: :algorythmo_stage
    position { 1.0 }
    stage_entered_at { Time.current }
    deleted { false }
  end
end
