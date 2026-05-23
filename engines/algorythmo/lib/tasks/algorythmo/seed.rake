# frozen_string_literal: true

# algorythmo: playwright-gate
# Rake tasks for seeding Algorythmo OS test data.
# Used by CI Playwright gate and local dev setup.
namespace :algorythmo do
  namespace :seed do
    desc 'Create minimal smoke-test account for Playwright M0 suite'
    task smoke_test_account: :environment do
      email = 'test@algorythmo.com'
      password = 'Test@12345'

      if User.exists?(email: email)
        puts "[algorythmo:seed] Test user #{email} already exists — skipping."
        next
      end

      # Create a super admin user (can login and access accounts)
      user = User.new(
        name: 'Algorythmo Test',
        email: email,
        password: password,
        password_confirmation: password,
        type: 'SuperAdmin'
      )
      user.skip_confirmation!
      user.save!
      puts "[algorythmo:seed] Created test user: #{email}"

      # Create a test account
      account = Account.create!(
        name: 'Algorythmo OS Test Account',
        locale: :en
      )
      puts "[algorythmo:seed] Created test account: #{account.name} (id=#{account.id})"

      # Associate user as admin of the account
      AccountUser.create!(
        account: account,
        user: user,
        role: :administrator
      )
      puts "[algorythmo:seed] #{email} is administrator of account #{account.id}"
    end
  end
end
