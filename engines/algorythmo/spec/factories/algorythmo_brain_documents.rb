# frozen_string_literal: true

FactoryBot.define do
  # FactoryBot conventionally resolves :algorythmo_brain_document →
  # Algorythmo::Brain::Document via classify (AlgorythmoBrainDocument →
  # Algorythmo::Brain::Document). We supply the class explicitly to avoid
  # any classify-based mismatch.
  factory :algorythmo_brain_document, class: Algorythmo::Brain::Document do
    association :account
    association :user

    filename     { 'manual.md' }
    content_type { 'text/markdown' }
    byte_size    { 128 }
    category     { 'manuals' }
    status       { :pending }
  end
end
