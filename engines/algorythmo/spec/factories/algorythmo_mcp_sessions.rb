# frozen_string_literal: true

FactoryBot.define do
  factory :algorythmo_mcp_session, class: 'Algorythmo::McpSession' do
    association :user,    factory: :user
    association :account, factory: :account

    token_hash { Digest::SHA256.hexdigest(SecureRandom.hex(32)) }
    scope      { Algorythmo::McpScopes::READ_TRUTH }
    expires_at { 8.hours.from_now }
    revoked_at { nil }
    last_used_at { nil }

    trait :revoked do
      revoked_at { 1.minute.ago }
    end

    trait :expired do
      expires_at { 1.second.ago }
    end

    trait :admin_scope do
      scope { Algorythmo::McpScopes::ADMIN }
    end
  end
end
