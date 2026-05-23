# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Pipeline, type: :model do
  let(:account) { create(:account) }

  describe 'associations' do
    it { is_expected.to belong_to(:account) }
    it { is_expected.to have_many(:stages) }
  end

  describe 'validations' do
    it { is_expected.to validate_presence_of(:name) }
  end

  describe '.cached_default_for' do
    context 'when no pipeline exists' do
      it 'returns nil' do
        expect(described_class.cached_default_for(account)).to be_nil
      end
    end

    context 'when a pipeline exists' do
      let!(:pipeline) do
        p = described_class.create!(account: account, name: 'Main')
        Algorythmo::Stage.create!(pipeline: p, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
        p
      end

      it 'returns the pipeline' do
        result = described_class.cached_default_for(account)
        expect(result.id).to eq(pipeline.id)
      end

      it 'caches the result' do
        # First call populates cache
        described_class.cached_default_for(account)

        # Second call should NOT hit the DB (query count stays same)
        query_count = 0
        counter = ->(_name, _start, _finish, _id, payload) { query_count += 1 if payload[:sql]&.include?('algorythmo_pipelines') }
        ActiveSupport::Notifications.subscribed(counter, 'sql.active_record') do
          described_class.cached_default_for(account)
        end

        expect(query_count).to eq(0)
      end

      it 'busts cache after a stage rename (cache_key_with_version changes)' do
        described_class.cached_default_for(account) # populate

        stage = pipeline.stages.first
        stage.rename('Novo Renomeado')

        # After rename, pipeline.updated_at changed via touch: true on stage
        # so the cache key changes and we get a fresh result
        result = described_class.cached_default_for(account)
        expect(result.stages.first.name).to eq('Novo Renomeado')
      end

      it 'busts cache after update_aging_coefficient' do
        described_class.cached_default_for(account) # populate

        stage = pipeline.stages.first
        stage.update_aging_coefficient(99.0)

        result = described_class.cached_default_for(account)
        expect(result.stages.first.aging_coefficient).to eq(99.0)
      end
    end
  end
end
