# frozen_string_literal: true

require 'rails_helper'
require 'fileutils'
require 'tmpdir'
require 'rake'

# §8.3 spec for cleanup_legacy_leads. Five scenarios:
#  1. dev happy path — deletes only legacy rows, keeps the rest
#  2. idempotency — re-running is a no-op (0 deletes)
#  3. production without --force — aborts with clear message
#  4. production with --force but no env var — aborts with clear message
#  5. production with --force AND env var — executes + writes audit log
#
# Tests target the underlying service class directly (Algorythmo::Tasks::CleanupLegacyLeads)
# because Rake::Task invocation reaches it the same way the CLI does. A separate
# end-to-end test asserts the rake task itself wires force/env correctly.

# Rake mixes its DSL (`namespace`, `task`, `desc`) into the top-level `main`
# object via its CLI bootstrap. When `load`-ing a .rake file from RSpec we
# don't get that bootstrap — mix it in manually so the file evaluates cleanly.
main_obj = TOPLEVEL_BINDING.eval('self')
main_obj.extend(Rake::DSL) unless main_obj.singleton_class.include?(Rake::DSL)
Rake.application ||= Rake::Application.new

# The rake file defines the service class as a side effect — load it once.
load Rails.root.join('engines/algorythmo/lib/tasks/algorythmo/cleanup.rake')

RSpec.describe Algorythmo::Tasks::CleanupLegacyLeads do
  let(:account) { create(:account) }
  let(:contact) { create(:contact, account: account) }
  let(:audit_dir) { Pathname.new(Dir.mktmpdir('cleanup_audit_')) }

  def seed_pipeline!
    p = Algorythmo::Pipeline.create!(account: account, name: 'Main')
    Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
    p.reload
  end

  def novo_stage
    @novo_stage ||= seed_pipeline!.stages.first
  end

  def create_legacy_lead!(extra = {})
    Algorythmo::Lead.create!(
      account: account,
      contact: contact,
      stage: novo_stage,
      position: rand * 1000,
      stage_entered_at: Time.current,
      channel_origin: nil,
      last_message_at: nil,
      **extra
    )
  end

  def create_normal_lead!
    Algorythmo::Lead.create!(
      account: account,
      contact: contact,
      stage: novo_stage,
      position: rand * 1000,
      stage_entered_at: Time.current,
      channel_origin: 'widget',
      last_message_at: Time.current
    )
  end

  def execute!(force: false, confirm_env: nil, env: ActiveSupport::StringInquirer.new('development'))
    described_class.execute!(
      force: force,
      confirm_env: confirm_env,
      env: env,
      logger: Rails.logger,
      audit_dir: audit_dir,
      output: StringIO.new
    )
  end

  after { FileUtils.remove_entry(audit_dir) if File.directory?(audit_dir) }

  describe 'dev happy path' do
    it 'deletes only legacy leads, leaves normal leads untouched' do
      legacy_ids = Array.new(5) { create_legacy_lead!.id }
      normal_ids = Array.new(5) { create_normal_lead!.id }

      result = execute!

      expect(result[:deleted]).to eq(5)
      expect(Algorythmo::Lead.where(id: legacy_ids).count).to eq(0)
      expect(Algorythmo::Lead.where(id: normal_ids).count).to eq(5)
    end

    it 'treats channel_origin = "" the same as nil (both legacy)' do
      blank_origin = create_legacy_lead!(channel_origin: '').id
      nil_origin   = create_legacy_lead!.id

      result = execute!

      expect(result[:deleted]).to eq(2)
      expect(Algorythmo::Lead.where(id: [blank_origin, nil_origin])).to be_empty
    end
  end

  describe 'idempotency' do
    it 'second run after first deletes 0 rows' do
      Array.new(3) { create_legacy_lead! }

      first  = execute!
      second = execute!

      expect(first[:deleted]).to eq(3)
      expect(second[:deleted]).to eq(0)
    end

    it 'still writes an audit log on a 0-delete run' do
      result = execute!

      expect(result[:deleted]).to eq(0)
      expect(File.exist?(result[:audit_path])).to be(true)
    end
  end

  describe 'production gating' do
    let(:prod_env) { ActiveSupport::StringInquirer.new('production') }

    it 'aborts when --force is not set, regardless of env var' do
      create_legacy_lead!

      expect do
        execute!(force: false, confirm_env: described_class::CONFIRM_TOKEN, env: prod_env)
      end.to raise_error(described_class::AbortedByGate, /--force/)

      expect(Algorythmo::Lead.count).to eq(1)
    end

    it 'aborts when --force is set but ALGORYTHMO_CLEANUP_CONFIRM is missing' do
      create_legacy_lead!

      expect do
        execute!(force: true, confirm_env: nil, env: prod_env)
      end.to raise_error(described_class::AbortedByGate, /ALGORYTHMO_CLEANUP_CONFIRM/)

      expect(Algorythmo::Lead.count).to eq(1)
    end

    it 'aborts when --force is set but the env var value is wrong' do
      create_legacy_lead!

      expect do
        execute!(force: true, confirm_env: 'yes', env: prod_env)
      end.to raise_error(described_class::AbortedByGate, /ALGORYTHMO_CLEANUP_CONFIRM/)

      expect(Algorythmo::Lead.count).to eq(1)
    end

    context 'when both gates pass' do
      let!(:legacy_ids) { Array.new(2) { create_legacy_lead!.id } }
      let(:result) { execute!(force: true, confirm_env: described_class::CONFIRM_TOKEN, env: prod_env) }

      it 'deletes the legacy rows' do
        expect(result[:deleted]).to eq(2)
        expect(Algorythmo::Lead.where(id: legacy_ids)).to be_empty
      end

      it 'writes the audit log with gate state, env, counts and scanned ids' do
        audit_path = result[:audit_path]
        expect(File.exist?(audit_path)).to be(true)
        audit = File.read(audit_path)
        expect(audit).to match(/env=production/)
        expect(audit).to match(/force_flag=true/)
        expect(audit).to match(/confirm_env_present=true/)
        expect(audit).to match(/deleted_count=2/)
        expect(audit).to match(/scanned_count=2/)
        legacy_ids.each { |id| expect(audit).to include(id.to_s) }
      end
    end
  end

  describe 'audit log path naming' do
    it 'writes to tmp/cleanup_legacy_leads_<unix>.log inside the configured audit dir' do
      travel_to(Time.zone.at(1_700_000_000)) do
        result = execute!
        expected = audit_dir.join('cleanup_legacy_leads_1700000000.log').to_s
        expect(result[:audit_path]).to eq(expected)
      end
    end
  end

  describe 'rake CLI wiring' do
    # Guards the surface that the service-class specs above don't reach:
    # how the rake task extracts `--force` from ARGV and CONFIRM_TOKEN
    # from ENV. A typo in either name (e.g. `'--Force'`, `'ALGORYTMO_…'`)
    # would silently bypass the gate without breaking any service spec.
    before do
      # Force re-load so the rake `task` block re-registers with our
      # newly-instantiated Rake application below.
      Rake.application = Rake::Application.new
      load Rails.root.join('engines/algorythmo/lib/tasks/algorythmo/cleanup.rake')
      Rake::Task.define_task(:environment) # stub :environment dependency
    end

    it 'reads --force from ARGV and CONFIRM_TOKEN from ENV in production' do
      legacy_id = create_legacy_lead!.id

      original_argv = ARGV.dup
      original_env  = ENV.fetch('ALGORYTHMO_CLEANUP_CONFIRM', nil)
      begin
        ARGV.replace(['algorythmo:crm:cleanup_legacy_leads', '--', '--force'])
        ENV['ALGORYTHMO_CLEANUP_CONFIRM'] = described_class::CONFIRM_TOKEN

        # Stub Rails.env to production for this invocation only.
        allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))

        # Route audit log to our tmpdir so the assertion is isolated.
        captured_dir = audit_dir
        allow_any_instance_of(described_class).to receive(:initialize).and_wrap_original do |orig, **kwargs|
          orig.call(**kwargs, audit_dir: captured_dir, output: StringIO.new)
        end

        Rake::Task['algorythmo:crm:cleanup_legacy_leads'].invoke

        expect(Algorythmo::Lead.where(id: legacy_id)).to be_empty
      ensure
        ARGV.replace(original_argv)
        ENV['ALGORYTHMO_CLEANUP_CONFIRM'] = original_env
        Rake::Task['algorythmo:crm:cleanup_legacy_leads'].reenable
      end
    end

    it 'aborts the rake task when --force missing in production' do
      create_legacy_lead!

      original_argv = ARGV.dup
      original_env  = ENV.fetch('ALGORYTHMO_CLEANUP_CONFIRM', nil)
      begin
        ARGV.replace(['algorythmo:crm:cleanup_legacy_leads'])
        ENV['ALGORYTHMO_CLEANUP_CONFIRM'] = described_class::CONFIRM_TOKEN
        allow(Rails).to receive(:env).and_return(ActiveSupport::StringInquirer.new('production'))

        expect do
          Rake::Task['algorythmo:crm:cleanup_legacy_leads'].invoke
        end.to raise_error(SystemExit)

        expect(Algorythmo::Lead.count).to eq(1)
      ensure
        ARGV.replace(original_argv)
        ENV['ALGORYTHMO_CLEANUP_CONFIRM'] = original_env
        Rake::Task['algorythmo:crm:cleanup_legacy_leads'].reenable
      end
    end
  end
end
