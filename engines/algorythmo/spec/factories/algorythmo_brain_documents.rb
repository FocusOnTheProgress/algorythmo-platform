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

    after(:build) do |document|
      document.file.attach(
        io: StringIO.new("# Manual\n\nConteúdo de teste."),
        filename: document.filename,
        content_type: document.content_type
      )
    end
  end
end
