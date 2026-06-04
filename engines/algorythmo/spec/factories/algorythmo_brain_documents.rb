# frozen_string_literal: true

FactoryBot.define do
  factory :algorythmo_brain_document, class: 'Algorythmo::Brain::Document' do
    association :account
    association :user

    filename     { 'manual.md' }
    content_type { 'text/markdown' }
    byte_size    { 128 }
    category     { 'manuals' }
    status       { :pending }

    # Active Storage requires the record to be persisted before attaching.
    # after(:build) raises in Rails 7.1 with the test service on an unsaved record.
    # Specs that only build (validations) do not need a real blob attached.
    after(:create) do |document|
      document.file.attach(
        io: StringIO.new("# Manual\n\nConteúdo de teste."),
        filename: document.filename,
        content_type: document.content_type
      )
    end
  end
end
