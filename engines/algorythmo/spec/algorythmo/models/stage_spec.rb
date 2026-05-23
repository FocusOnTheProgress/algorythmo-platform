# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Stage, type: :model do
  let(:account)  { create(:account) }
  let(:pipeline) { Algorythmo::Pipeline.create!(account: account, name: 'Main') }

  def build_stage(attrs = {})
    described_class.new({ pipeline: pipeline, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0 }.merge(attrs))
  end

  describe 'validations' do
    it { expect(build_stage).to be_valid }
    it { expect(build_stage(name: '')).not_to be_valid }
    it { expect(build_stage(aging_coefficient: -1)).not_to be_valid }
    it { expect(build_stage(aging_coefficient: 0)).to be_valid }

    it 'enforces name uniqueness within pipeline (case-insensitive)' do
      described_class.create!(pipeline: pipeline, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0)
      duplicate = build_stage(name: 'novo', position: 1)
      expect(duplicate).not_to be_valid
    end
  end

  describe '#rename' do
    let!(:stage) { described_class.create!(pipeline: pipeline, name: 'Proposta', kind: :open, position: 2, aging_coefficient: 7.0) }

    it 'renames successfully' do
      expect(stage.rename('Orçamento enviado')).to be_truthy
      expect(stage.reload.name).to eq('Orçamento enviado')
    end

    it 'rejects blank name' do
      expect(stage.rename('')).to be_falsy
      expect(stage.errors[:name]).not_to be_empty
    end

    it 'rejects whitespace-only name' do
      expect(stage.rename('   ')).to be_falsy
    end

    it 'rejects duplicate name (case-insensitive)' do
      described_class.create!(pipeline: pipeline, name: 'Outro', kind: :open, position: 3, aging_coefficient: 1.0)
      expect(stage.rename('outro')).to be_falsy
      expect(stage.errors[:name]).not_to be_empty
    end

    it 'allows renaming to the same name' do
      expect(stage.rename('Proposta')).to be_truthy
    end
  end

  describe '#update_aging_coefficient' do
    let!(:stage) { described_class.create!(pipeline: pipeline, name: 'Novo', kind: :open, position: 0, aging_coefficient: 1.0) }

    it 'updates to a valid coefficient' do
      expect(stage.update_aging_coefficient(4.0)).to be_truthy
      expect(stage.reload.aging_coefficient).to eq(4.0)
    end

    it 'accepts 0.0 (neutral — no aging alert)' do
      expect(stage.update_aging_coefficient(0.0)).to be_truthy
      expect(stage.reload.aging_coefficient).to eq(0.0)
    end

    it 'rejects negative coefficient' do
      expect(stage.update_aging_coefficient(-1.0)).to be_falsy
      expect(stage.errors[:aging_coefficient]).not_to be_empty
    end
  end
end
