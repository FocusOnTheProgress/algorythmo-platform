# frozen_string_literal: true

require 'rails_helper'

# Validates Brain::Client interface contract (frozen in PR M3-1).
# Ensures the skeleton exposes the 5 required methods before body lands in PR M3-2.
RSpec.describe Algorythmo::Brain::Client do
  subject(:client) { described_class.new(1) }

  describe 'interface' do
    it 'accepts account_id in the constructor' do
      expect { described_class.new(42) }.not_to raise_error
    end

    describe '#capture' do
      it 'responds to capture with keyword arg file:' do
        expect(client).to respond_to(:capture)
      end

      it 'raises NotImplementedError (body in PR M3-2)' do
        expect { client.capture(file: '/tmp/test.md') }.to raise_error(NotImplementedError)
      end
    end

    describe '#search' do
      it 'responds to search with keyword arg query:' do
        expect(client).to respond_to(:search)
      end

      it 'raises NotImplementedError (body in PR M3-2)' do
        expect { client.search(query: 'test') }.to raise_error(NotImplementedError)
      end
    end

    describe '#think' do
      it 'responds to think with keyword arg prompt:' do
        expect(client).to respond_to(:think)
      end

      it 'raises NotImplementedError (body in PR M3-2)' do
        expect { client.think(prompt: 'what is our pricing?') }.to raise_error(NotImplementedError)
      end
    end

    describe '#export' do
      it 'responds to export with keyword arg out:' do
        expect(client).to respond_to(:export)
      end

      it 'raises NotImplementedError (body in PR M3-2)' do
        expect { client.export(out: '/tmp/brain_export') }.to raise_error(NotImplementedError)
      end
    end

    describe '#stats' do
      it 'responds to stats' do
        expect(client).to respond_to(:stats)
      end

      it 'raises NotImplementedError (body in PR M3-2)' do
        expect { client.stats }.to raise_error(NotImplementedError)
      end
    end
  end
end
