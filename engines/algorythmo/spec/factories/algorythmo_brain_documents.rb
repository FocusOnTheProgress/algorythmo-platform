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

    # No after(:build) / after(:create) attachment here.
    # Active Storage has_one_attached :file is required only by the worker
    # (blob.open). Tests that need an actual attached blob build it explicitly:
    #   document.file.attach(io: StringIO.new('content'), filename: 'f.md', content_type: 'text/plain')
    # The column-level factory (above) is enough for every spec that
    # tests status transitions, validations, or controller rendering.
  end
end
