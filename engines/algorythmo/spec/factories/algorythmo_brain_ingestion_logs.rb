# frozen_string_literal: true

FactoryBot.define do
  factory :algorythmo_brain_ingestion_log, class: 'Algorythmo::Brain::IngestionLog' do
    association :account
    association :conversation

    outcome { :success }
    brain_indexed_at { Time.current }
    brain_page_path  { '/brain/conversations/test.md' }
  end
end
