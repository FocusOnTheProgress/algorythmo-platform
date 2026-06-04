# frozen_string_literal: true

# algorythmo: factory for Algorythmo::Brain::Document (plan 0012 PR3).
# Lives in spec/factories (host path) so factory_bot_rails discovers it
# unconditionally — the engine spec/factories path is engine-spec-only.
FactoryBot.define do
  factory :algorythmo_brain_document, class: 'Algorythmo::Brain::Document' do
    association :account
    association :user

    filename     { 'manual.md' }
    content_type { 'text/markdown' }
    byte_size    { 128 }
    category     { 'manuals' }
    status       { :pending }
  end
end
