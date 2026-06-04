# frozen_string_literal: true

require 'rails_helper'
require 'rake'

# Unit spec for the per-account brain provisioner (P0-4). Open3.capture3 is fully
# stubbed — no real gbrain binary, no TTY, no API keys hit the network. We assert:
#   - init uses the cravado embedding provider/dimensions and is non-TTY-safe
#   - models.think is set to deepseek
#   - re-running is idempotent (init carries --force)
#   - missing keys fail clearly BEFORE any subprocess runs
#   - keys live only in the env hash, never in argv
#   - per-account GBRAIN_HOME is injected

main_obj = TOPLEVEL_BINDING.eval('self')
main_obj.extend(Rake::DSL) unless main_obj.singleton_class.include?(Rake::DSL)
Rake.application ||= Rake::Application.new

unless Rake::Task.task_defined?('algorythmo:brain:provision')
  load Rails.root.join('engines/algorythmo/lib/tasks/algorythmo/brain/provision.rake') # rubocop:disable Style/IfUnlessModifier
end

RSpec.describe Algorythmo::Tasks::BrainProvision do
  subject(:provisioner) { described_class.new(account_id: account_id, output: output) }

  let(:account_id) { 42 }
  let(:output)     { StringIO.new }

  # Records every Open3.capture3 invocation as { env:, argv: } and returns success.
  def stub_capture3_success
    calls = []
    status = instance_double(Process::Status, success?: true, exitstatus: 0)
    allow(Open3).to receive(:capture3) do |env, *argv|
      calls << { env: env, argv: argv }
      ['ok', '', status]
    end
    calls
  end

  around do |example|
    ClimateControl.modify(OPENAI_API_KEY: 'sk-openai-test', DEEPSEEK_API_KEY: 'sk-deepseek-test') do
      example.run
    end
  end

  describe '#run!' do
    it 'runs init then config set, each with success' do
      calls = stub_capture3_success
      provisioner.run!

      labels = calls.map { |c| c[:argv][1] } # argv[0]=gbrain, argv[1]=subcommand
      expect(labels).to eq(%w[init config])
    end

    it 'init pins the embedding provider and dimensions (no auto-detect picker)' do
      calls = stub_capture3_success
      provisioner.run!

      init = calls.first[:argv]
      expect(init).to include('--embedding-model', 'openai:text-embedding-3-small')
      expect(init).to include('--embedding-dimensions', '1536')
    end

    it 'init is non-TTY-safe and idempotent (--non-interactive + --force + --pglite)' do
      calls = stub_capture3_success
      provisioner.run!

      init = calls.first[:argv]
      expect(init).to include('--non-interactive')
      expect(init).to include('--force')
      expect(init).to include('--pglite')
    end

    it 'sets models.think to deepseek' do
      calls = stub_capture3_success
      provisioner.run!

      config = calls.last[:argv]
      expect(config).to eq(%w[gbrain config set models.think deepseek:deepseek-chat])
    end

    it 'injects the per-account GBRAIN_HOME into every subprocess env' do
      calls = stub_capture3_success
      provisioner.run!

      expected_home = Algorythmo::Brain::Client.gbrain_home_for(account_id)
      calls.each do |call|
        expect(call[:env]['GBRAIN_HOME']).to eq(expected_home)
      end
    end

    it 'passes keys only in the env hash, never in argv' do
      calls = stub_capture3_success
      provisioner.run!

      calls.each do |call|
        expect(call[:env]['OPENAI_API_KEY']).to eq('sk-openai-test')
        expect(call[:env]['DEEPSEEK_API_KEY']).to eq('sk-deepseek-test')
        expect(call[:argv].join(' ')).not_to include('sk-openai-test')
        expect(call[:argv].join(' ')).not_to include('sk-deepseek-test')
      end
    end

    it 'is idempotent: a second run issues the same commands without error' do
      stub_capture3_success
      expect { provisioner.run! }.not_to raise_error
      expect { provisioner.run! }.not_to raise_error
    end

    it 'raises ProvisionError with a redacted message when a step fails' do
      status = instance_double(Process::Status, success?: false, exitstatus: 1)
      allow(Open3).to receive(:capture3).and_return(['', 'auth failed sk-deepseek-test', status])

      expect { provisioner.run! }.to raise_error(described_class::ProvisionError) do |err|
        expect(err.message).to include('[REDACTED]')
        expect(err.message).not_to include('sk-deepseek-test')
      end
    end

    it 'raises ProvisionError when the gbrain binary is missing' do
      allow(Open3).to receive(:capture3).and_raise(Errno::ENOENT, 'gbrain')
      expect { provisioner.run! }.to raise_error(described_class::ProvisionError, /not found/)
    end
  end

  describe 'key validation' do
    it 'fails clearly when OPENAI_API_KEY is missing, before any subprocess' do
      allow(Open3).to receive(:capture3)
      ClimateControl.modify(OPENAI_API_KEY: nil) do
        expect { provisioner.run! }
          .to raise_error(described_class::ProvisionError, /OPENAI_API_KEY/)
      end
      expect(Open3).not_to have_received(:capture3)
    end

    it 'fails clearly when DEEPSEEK_API_KEY is missing' do
      allow(Open3).to receive(:capture3)
      ClimateControl.modify(DEEPSEEK_API_KEY: nil) do
        expect { provisioner.run! }
          .to raise_error(described_class::ProvisionError, /DEEPSEEK_API_KEY/)
      end
      expect(Open3).not_to have_received(:capture3)
    end
  end
end
