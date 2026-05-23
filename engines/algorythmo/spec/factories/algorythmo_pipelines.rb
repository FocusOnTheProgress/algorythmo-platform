# frozen_string_literal: true

FactoryBot.define do
  factory :algorythmo_pipeline, class: 'Algorythmo::Pipeline' do
    account
    sequence(:name) { |n| "Pipeline #{n}" }
  end
end
