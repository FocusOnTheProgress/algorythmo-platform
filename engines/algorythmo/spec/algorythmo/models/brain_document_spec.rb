# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Algorythmo::Brain::Document do
  subject(:document) { build(:algorythmo_brain_document) }

  it 'is valid with the factory defaults' do
    expect(document).to be_valid
  end

  describe 'status enum' do
    it 'exposes the four lifecycle states with the _status_ prefix' do
      expect(described_class.statuses).to eq('pending' => 0, 'extracting' => 1, 'captured' => 2, 'failed' => 3)
      expect(document).to be_status_pending
    end
  end

  describe 'validations' do
    it 'requires a filename' do
      document.filename = nil
      expect(document).not_to be_valid
    end

    it 'rejects a category outside the allowlist' do
      document.category = 'unknown'
      expect(document).not_to be_valid
    end

    it 'rejects a byte_size over the 10 MiB ceiling' do
      document.byte_size = described_class::MAX_BYTE_SIZE + 1
      expect(document).not_to be_valid
    end

    it 'rejects a zero byte_size' do
      document.byte_size = 0
      expect(document).not_to be_valid
    end
  end

  describe 'associations' do
    it 'has an attached file' do
      expect(document.file).to be_attached
    end

    it 'allows a null user (uploader removed later)' do
      document.user = nil
      expect(document).to be_valid
    end
  end
end
