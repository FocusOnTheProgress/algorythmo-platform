require 'webmock/rspec'

WebMock.disable_net_connect!(allow_localhost: true)

RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups

  def with_modified_env(options, &)
    ClimateControl.modify(options, &)
  end

  # :gbrain_real specs spawn a real gbrain subprocess (binary + API keys required).
  # Excluded from CI automatically; opt in with GBRAIN_REAL=1.
  # This filter lives HERE (host spec_helper) because `.rspec --require spec_helper`
  # resolves to spec/spec_helper.rb; the engine's own spec_helper.rb is NOT loaded
  # by the CI runner. The engine spec_helper keeps a mirror for local engine-only runs.
  config.filter_run_excluding(:gbrain_real) unless ENV['GBRAIN_REAL'] == '1'
end
