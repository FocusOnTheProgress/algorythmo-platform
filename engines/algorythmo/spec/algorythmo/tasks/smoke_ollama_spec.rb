# frozen_string_literal: true

require 'rails_helper'
require 'rake'
require 'webmock/rspec'

# Day-0 BYOK embedding smoke spec — decision D-OQ5.
#
# Validates the Algorythmo::Tasks::SmokeOllama service class directly (same
# pattern as cleanup_legacy_leads_spec.rb). Three scenarios:
#
#   1. Happy path — Ollama returns 10 valid 768-dim embeddings, all <5s.
#   2. Ollama offline — Errno::ECONNREFUSED on first request; run! raises.
#   3. Model not found — Ollama returns HTTP 404; run! raises.
#
# Net::HTTP is stubbed via WebMock — no real Ollama required.

main_obj = TOPLEVEL_BINDING.eval('self')
main_obj.extend(Rake::DSL) unless main_obj.singleton_class.include?(Rake::DSL)
Rake.application ||= Rake::Application.new

unless Rake::Task.task_defined?('algorythmo:brain:smoke_ollama')
  load Rails.root.join('engines/algorythmo/lib/tasks/algorythmo/brain/smoke_ollama.rake')
end

RSpec.describe Algorythmo::Tasks::SmokeOllama do
  subject(:smoke) { described_class.new(host: host, model: model, output: output) }

  let(:host)   { 'http://localhost:11434/v1' } # OpenAI-compat base (same as gbrain's OLLAMA_BASE_URL)
  let(:model)  { 'nomic-embed-text' }
  let(:output) { StringIO.new }
  let(:embedding_768) { Array.new(768, 0.01) }

  # Helper: stub a successful Ollama response for a single POST.
  # OpenAI-compatible embeddings shape: { model, input } -> { data: [{ embedding }] }.
  def stub_ollama_success(prompt)
    stub_request(:post, "#{host}/embeddings")
      .with(body: hash_including('model' => model, 'input' => prompt))
      .to_return(
        status: 200,
        body: JSON.generate(data: [{ embedding: embedding_768 }]),
        headers: { 'Content-Type' => 'application/json' }
      )
  end

  describe '#run!' do
    context 'happy path — all 10 queries succeed within 5 s' do
      before do
        described_class::QUERIES.each { |q| stub_ollama_success(q) }
      end

      it 'does not raise' do
        expect { smoke.run! }.not_to raise_error
      end

      it 'prints a 10/10 passed summary' do
        smoke.run!
        expect(output.string).to include('10/10 passed')
      end

      it 'prints a row for every query' do
        smoke.run!
        described_class::QUERIES.each do |q|
          expect(output.string).to include(q[0, 30])
        end
      end

      it 'prints success check marks' do
        smoke.run!
        # 10 green check marks
        expect(output.string.scan('✓').size).to eq(10)
      end
    end

    context 'Ollama offline (Errno::ECONNREFUSED)' do
      before do
        stub_request(:post, "#{host}/embeddings")
          .to_raise(Errno::ECONNREFUSED)
      end

      it 'raises with a failure message' do
        expect { smoke.run! }.to raise_error(RuntimeError, /failed/)
      end

      it 'prints "Ollama offline" in the output' do
        smoke.run! rescue nil # rubocop:disable Style/RescueModifier
        expect(output.string).to include('Ollama offline')
      end

      it 'shows 0/10 passed in the summary' do
        smoke.run! rescue nil # rubocop:disable Style/RescueModifier
        expect(output.string).to match(%r{0/10 passed})
      end
    end

    context 'model not found (HTTP 404)' do
      before do
        stub_request(:post, "#{host}/embeddings")
          .to_return(status: 404, body: 'model not found')
      end

      it 'raises with a failure message' do
        expect { smoke.run! }.to raise_error(RuntimeError, /failed/)
      end

      it 'prints the HTTP 404 error in the output' do
        smoke.run! rescue nil # rubocop:disable Style/RescueModifier
        expect(output.string).to include('HTTP 404')
      end
    end
  end

  describe 'QUERIES constant' do
    it 'contains exactly 10 entries' do
      expect(described_class::QUERIES.size).to eq(10)
    end

    it 'has no blank entries' do
      expect(described_class::QUERIES).to all(satisfy { |q| q.strip.length > 10 })
    end
  end

  describe 'EXPECTED_DIM' do
    it 'is 768 (nomic-embed-text)' do
      expect(described_class::EXPECTED_DIM).to eq(768)
    end
  end
end
