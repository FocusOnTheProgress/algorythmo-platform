# frozen_string_literal: true

require 'rails_helper'
require 'tmpdir'
require 'open3'

# REAL gbrain integration gate — the manual proof-of-life before the Copiloto
# state machine (PR 6) ships against a live brain.
#
# This spec spawns the actual gbrain CLI. It is EXCLUDED from CI via two independent
# guards (defence-in-depth):
#   1. config.filter_run_excluding(:gbrain_real) in spec/spec_helper.rb (HOST — always
#      loaded by the CI runner) and mirrored in the engine spec_helper.rb.
#   2. `before { skip ... unless GBRAIN_REAL }` inside the spec itself.
# Both must agree; neither alone is sufficient — see CORREÇÃO 1 (adversarial review).
#
# How to run (locally, with a brain-capable machine + keys):
#   GBRAIN_REAL=1 \
#   ZEROENTROPY_API_KEY=ze-... DEEPSEEK_API_KEY=sk-... \
#   bundle exec rspec engines/algorythmo/spec/algorythmo/services/brain/gbrain_real_integration_spec.rb
#
# What it proves:
#   1. A freshly-provisioned brain is provisioned via the SAME rake provisioner.
#   2. capture → stats → search round-trips a real markdown page.
#   3. Isolation (P0-5): a SECOND brand-new account brain is born with 0 pages,
#      proving GBRAIN_HOME per-account does not leak the first account's data.
RSpec.describe 'GBrain real integration', :gbrain_real do
  let(:account_a) { 900_001 }
  let(:account_b) { 900_002 }

  # Self-guard: never run in normal CI, even if the :gbrain_real tag filter is not
  # configured for this run (the engine spec_helper is not always the entry point).
  before do
    skip 'real gbrain gate — opt in with GBRAIN_REAL=1' unless ENV['GBRAIN_REAL'] == '1'
  end

  # Override the per-account base so the test never touches the real ~/.gbrain-accounts.
  # No-op (and zero side effects) outside the GBRAIN_REAL gate so normal CI runs clean.
  around do |example|
    unless ENV['GBRAIN_REAL'] == '1'
      example.run # `before` will skip it
      next
    end

    skip 'set ZEROENTROPY_API_KEY + DEEPSEEK_API_KEY to run' if ENV['ZEROENTROPY_API_KEY'].to_s.empty? || ENV['DEEPSEEK_API_KEY'].to_s.empty?

    client_rb = Rails.root.join('engines/algorythmo/app/services/algorythmo/brain/client.rb')
    Dir.mktmpdir('gbrain_real_') do |base|
      ClimateControl.modify(GBRAIN_HOME_BASE: base) do
        # GBRAIN_HOME_BASE is read at class load; reload Client so the constant picks up the tmp base.
        load client_rb
        example.run
      ensure
        load client_rb # restore the production-configured constant
      end
    end
  end

  def provision!(account_id)
    Algorythmo::Tasks::BrainProvision.run!(account_id: account_id, output: StringIO.new)
  end

  def capture_markdown!(account_id, body)
    Dir.mktmpdir('gbrain_real_md_') do |dir|
      path = File.join(dir, 'note.md')
      File.write(path, body)
      Algorythmo::Brain::WriteLock.with_lock(account_id: account_id) do
        Algorythmo::Brain::Client.new(account_id).capture(file: path)
      end
    end
  end

  it 'provisions, captures, finds via stats + search, and isolates accounts (P0-5)' do
    provision!(account_a)

    capture_markdown!(account_a, "# Pricing policy\n\nAlgorythmo charges a flat monthly fee per seat.")

    stats_a = Algorythmo::Brain::Client.new(account_a).stats
    expect(page_count(stats_a)).to be >= 1

    search_a = Algorythmo::Brain::Client.new(account_a).search(query: 'pricing policy')
    expect(search_a).to be_an(Array)
    expect(search_a).not_to be_empty

    # Isolation proof: a fresh, separately-provisioned account brain has 0 pages.
    provision!(account_b)
    stats_b = Algorythmo::Brain::Client.new(account_b).stats
    expect(page_count(stats_b)).to eq(0)
  end

  # Reads total_pages from the canonical stats shape verified in source at the pinned SHA:
  #   StatsResult.aggregate.total_pages  (src/core/schema-pack/stats.ts)
  #
  # Fails LOUD if gbrain renames the key on a bump — that's intentional: a rename
  # must be caught here (hard failure) not masked by a fallback chain that silently
  # returns 0 for both accounts (which would make the isolation assertion vacuous).
  def page_count(stats)
    raise "stats response is not a Hash (got #{stats.class})" unless stats.is_a?(Hash)

    aggregate = stats['aggregate']
    raise "stats missing 'aggregate' key — field may have been renamed on a gbrain bump" unless aggregate.is_a?(Hash)
    raise "aggregate missing 'total_pages' key — field may have been renamed on a gbrain bump" unless aggregate.key?('total_pages')

    Integer(aggregate['total_pages'])
  end
end
