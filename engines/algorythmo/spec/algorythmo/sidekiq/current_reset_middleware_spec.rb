# frozen_string_literal: true

require 'rails_helper'

# Adversarial review M1-C PR #52 (C1') — proves the middleware closes the
# thread_mattr_accessor stale-state hole described in
# config/initializers/algorythmo_sidekiq_current_reset.rb.
RSpec.describe Algorythmo::Sidekiq::CurrentResetMiddleware do
  subject(:middleware) { described_class.new }

  let(:account) { create(:account) }
  let(:alice)   { create(:user, account: account) }

  after { Current.reset }

  it 'resets Current.user BEFORE yielding (cleans state leaked from prior job)' do
    Current.user = alice
    seen = nil

    middleware.call(nil, {}, 'default') do
      seen = Current.user
    end

    expect(seen).to be_nil
  end

  it 'resets Current.user AFTER yielding (cleans state set by the current job)' do
    middleware.call(nil, {}, 'default') do
      Current.user = alice
    end

    expect(Current.user).to be_nil
  end

  it 'resets Current.user AFTER yielding even when the job raises' do
    expect do
      middleware.call(nil, {}, 'default') do
        Current.user = alice
        raise 'boom'
      end
    end.to raise_error('boom')

    expect(Current.user).to be_nil
  end

  it 'resets every Current accessor (not just user)' do
    Current.user         = alice
    Current.account      = account
    Current.executed_by  = alice

    middleware.call(nil, {}, 'default') do
      expect(Current.user).to be_nil
      expect(Current.account).to be_nil
      expect(Current.executed_by).to be_nil
    end
  end
end
