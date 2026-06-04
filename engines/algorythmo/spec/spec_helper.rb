# frozen_string_literal: true

# Engine-level RSpec configuration.
# Loaded automatically when running `rspec engines/algorythmo/spec/`.
# The host application's spec/rails_helper.rb is included from here so we
# inherit FactoryBot, DatabaseCleaner, Shoulda, etc.

require_relative '../../../spec/rails_helper'

# Register engine factories so FactoryBot resolves Algorythmo::* model factories.
engine_factory_path = File.expand_path('factories', __dir__)
FactoryBot.definition_file_paths << engine_factory_path
FactoryBot.reload

RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end
  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end
  config.shared_context_metadata_behavior = :apply_to_host_groups

  # :gbrain_real specs spawn a REAL gbrain subprocess (needs the binary + API keys).
  # They are a manual gate before the Copiloto state machine (PR 6) ships — never
  # run in normal CI. Opt in with GBRAIN_REAL=1.
  config.filter_run_excluding(:gbrain_real) unless ENV['GBRAIN_REAL'] == '1'
end
