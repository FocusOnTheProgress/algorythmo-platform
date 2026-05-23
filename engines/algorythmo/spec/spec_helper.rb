# frozen_string_literal: true

# Engine-level RSpec configuration.
# Loaded automatically when running `rspec engines/algorythmo/spec/`.
# The host application's spec/rails_helper.rb is included from here so we
# inherit FactoryBot, DatabaseCleaner, Shoulda, etc.

require_relative '../../../spec/rails_helper'

RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end
  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end
  config.shared_context_metadata_behavior = :apply_to_host_groups
end
