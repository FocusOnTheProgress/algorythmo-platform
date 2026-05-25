# frozen_string_literal: true

# algorythmo: playwright-gate
# Rake tasks for seeding Algorythmo OS test data.
# Used by CI Playwright gate and local dev setup.
namespace :algorythmo do
  namespace :seed do
    desc 'Create minimal smoke-test account for Playwright M0 suite'
    task smoke_test_account: :environment do
      # Security gate: refuse to run in production unless the operator has
      # explicitly acknowledged the risk via ALGORYTHMO_SEED_PRODUCTION env var.
      # This prevents accidental data creation on production databases.
      unless Rails.env.development? || Rails.env.test? || ENV['ALGORYTHMO_SEED_PRODUCTION'] == 'I_UNDERSTAND_THE_RISK'
        raise 'algorythmo:seed tasks are restricted to development/test environments. ' \
              'Set ALGORYTHMO_SEED_PRODUCTION=I_UNDERSTAND_THE_RISK to override on production.'
      end

      email = 'test@algorythmo.com'
      password = ENV.fetch('ALGORYTHMO_SEED_PASSWORD') { raise 'ALGORYTHMO_SEED_PASSWORD env var required for seeding' }

      # Super-admin defaults match the Playwright fixture (_fixture.ts) so the
      # cuts suite logs in cleanly with no extra env wiring. Override in CI via
      # ALGORYTHMO_SEED_SUPER_EMAIL / ALGORYTHMO_SEED_SUPER_PASS if needed.
      super_email = ENV.fetch('ALGORYTHMO_SEED_SUPER_EMAIL', 'super@algorythmo.com')
      super_password = ENV.fetch('ALGORYTHMO_SEED_SUPER_PASS', 'Test@12345')

      # Regular dashboard user (type IS NULL). When it already exists we bail
      # out completely — the rest of the body (super-admin, account, features)
      # is bundled into the same fresh-DB seeding path. CI wipes the DB before
      # this task runs (db:schema:load), so re-entrancy through the create
      # branch is the only path that ever fires in CI. Local re-runs against
      # an already-seeded dev DB are a no-op.
      if User.exists?(email: email)
        puts "[algorythmo:seed] Test user #{email} already exists — skipping seed body."
        next
      end

      # SuperAdmin STI rows live in the same table but route through /super_admin.
      user = User.new(
        name: 'Algorythmo Test',
        email: email,
        password: password,
        password_confirmation: password
      )
      user.skip_confirmation!
      user.save!
      puts "[algorythmo:seed] Created test user: #{email}"

      # Super-admin user — required by the Algorythmo cuts Playwright suite
      # (spec/system/algorythmo/cuts/*) which toggles flags via
      # /super_admin/accounts/:id/algorythmo_flags.
      if SuperAdmin.exists?(email: super_email)
        puts "[algorythmo:seed] Super-admin #{super_email} already exists — skipping."
      else
        super_admin = SuperAdmin.new(
          email: super_email,
          password: super_password,
          password_confirmation: super_password
        )
        super_admin.skip_confirmation!
        super_admin.save!
        puts "[algorythmo:seed] Created super-admin: #{super_email}"
      end

      account = Account.create!(name: 'Algorythmo OS Test Account', locale: :en)
      puts "[algorythmo:seed] Created test account: #{account.name} (id=#{account.id})"

      AccountUser.create!(account: account, user: user, role: :administrator)
      puts "[algorythmo:seed] #{email} is administrator of account #{account.id}"

      # Enable the upstream Chatwoot feature flags whose surfaces the cuts
      # suite asserts on. Without these, 5 of the 13 surfaces would render
      # nothing even with the algorythmo cut flag OFF — the spec would prove
      # nothing about our gate. installation_type restrictions on custom_roles
      # are enforced at the policy layer, not at the bitfield level; flipping
      # the bit here is the right primitive for the test fixture.
      account.enable_features('sla', 'audit_logs', 'custom_roles', 'advanced_assignment')
      account.save!
      puts '[algorythmo:seed] Enabled upstream features: sla, audit_logs, custom_roles, advanced_assignment'
    end
  end
end
