# frozen_string_literal: true

require 'rails_helper'

# M0.5 — Adversarial #1: seed.rake env guard
# Asserts that the seed task refuses to run in production without the explicit override env var.
# This prevents accidental data creation on production databases via `rake algorythmo:seed:*`.
RSpec.describe 'algorythmo:seed:smoke_test_account', type: :task do
  # Rake task loading helper — avoids redefining tasks across examples.
  subject(:task) { Rake::Task['algorythmo:seed:smoke_test_account'] }

  before do
    Rake::Task.define_task(:environment)
    # Load tasks if not already loaded
    load Rails.root.join('engines/algorythmo/lib/tasks/algorythmo/seed.rake') unless Rake::Task.task_defined?('algorythmo:seed:smoke_test_account')
  rescue RuntimeError
    # Task already defined — fine
  end

  context 'when running in a production-like environment without override' do
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))
      ENV.delete('ALGORYTHMO_SEED_PRODUCTION')
      ENV['ALGORYTHMO_SEED_PASSWORD'] = 'test_password'
    end

    after do
      ENV.delete('ALGORYTHMO_SEED_PASSWORD')
    end

    it 'raises an error with a clear message' do
      expect { task.execute }.to raise_error(RuntimeError, %r{restricted to development/test environments})
    end
  end

  context 'when running in production with the override env var set' do
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))
      ENV['ALGORYTHMO_SEED_PRODUCTION'] = 'I_UNDERSTAND_THE_RISK'
      ENV['ALGORYTHMO_SEED_PASSWORD'] = 'test_password'
      # Stub DB calls so the task body doesn't actually run
      allow(User).to receive(:exists?).and_return(true)
    end

    after do
      ENV.delete('ALGORYTHMO_SEED_PRODUCTION')
      ENV.delete('ALGORYTHMO_SEED_PASSWORD')
    end

    it 'does not raise an env guard error' do
      expect { task.execute }.not_to raise_error
    end
  end

  context 'when ALGORYTHMO_SEED_PASSWORD is missing' do
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('development'))
      ENV.delete('ALGORYTHMO_SEED_PASSWORD')
    end

    it 'raises a descriptive KeyError' do
      expect { task.execute }.to raise_error(RuntimeError, /ALGORYTHMO_SEED_PASSWORD env var required/)
    end
  end

  context 'when running in development with the password set' do
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('development'))
      ENV['ALGORYTHMO_SEED_PASSWORD'] = 'dev_password'
      # Stub DB calls — we only test the guard, not the seeding logic
      allow(User).to receive(:exists?).and_return(true)
    end

    after do
      ENV.delete('ALGORYTHMO_SEED_PASSWORD')
    end

    it 'proceeds past the env guard' do
      expect { task.execute }.not_to raise_error
    end
  end

  context 'when running in test environment with the password set' do
    before do
      allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('test'))
      ENV['ALGORYTHMO_SEED_PASSWORD'] = 'test_password'
      allow(User).to receive(:exists?).and_return(true)
    end

    after do
      ENV.delete('ALGORYTHMO_SEED_PASSWORD')
    end

    it 'proceeds past the env guard' do
      expect { task.execute }.not_to raise_error
    end
  end
end
