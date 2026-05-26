# frozen_string_literal: true

require 'rails_helper'

# Validates Brain::WriteLock interface contract (frozen in PR M3-1).
# Full Redis NX EX + Lua atomic release body lands in PR M3-2.
RSpec.describe Algorythmo::Brain::WriteLock do
  describe 'interface' do
    describe '.with_lock' do
      it 'is defined as a class method' do
        expect(described_class).to respond_to(:with_lock)
      end

      it 'accepts a block argument' do
        method = described_class.method(:with_lock)
        expect(method.parameters).to include([:block, :block])
      end

      it 'raises NotImplementedError in the skeleton (body in PR M3-2)' do
        expect { described_class.with_lock { 'work' } }.to raise_error(NotImplementedError)
      end
    end

    describe 'LockContended' do
      it 'is defined as a named error class' do
        expect(described_class::LockContended).to be < StandardError
      end

      it 'can be raised and rescued' do
        expect {
          raise described_class::LockContended, 'lock held by another process'
        }.to raise_error(described_class::LockContended, 'lock held by another process')
      end
    end

    describe 'constants' do
      it 'exposes LOCK_KEY' do
        expect(described_class::LOCK_KEY).to eq('gbrain:write:lock')
      end

      it 'exposes LOCK_TTL as a positive integer' do
        expect(described_class::LOCK_TTL).to be_a(Integer)
        expect(described_class::LOCK_TTL).to be > 0
      end
    end
  end
end
