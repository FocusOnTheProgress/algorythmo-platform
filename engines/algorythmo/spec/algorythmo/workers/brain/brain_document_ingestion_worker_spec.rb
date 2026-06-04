# frozen_string_literal: true

require 'rails_helper'

# Covers the full contract of Algorythmo::Brain::BrainDocumentIngestionWorker (plan §2.3):
#   - capture() called under WriteLock.with_lock(account_id:) — per-account serialization
#   - success → status captured + brain_page_path
#   - failure → status failed + last_error, exception re-raises (Sidekiq retry)
#   - LockContended re-raises WITHOUT marking failed (retry condition)
#   - idempotent: an already-captured document is a no-op
#   - tmpfile/tmpdir removed (no /tmp leak)
RSpec.describe Algorythmo::Brain::BrainDocumentIngestionWorker do
  subject(:worker) { described_class.new }

  let(:account) { create(:account) }
  let(:document) do
    doc = create(:algorythmo_brain_document, account: account, filename: 'doc.md', content_type: 'text/markdown')
    doc.file.attach(io: StringIO.new("# Conteúdo\n"), filename: 'doc.md', content_type: 'text/markdown')
    doc
  end

  def stub_capture_success(page_path: '/brain/documents/doc.md')
    client = instance_double(Algorythmo::Brain::Client, capture: { 'page_path' => page_path })
    allow(Algorythmo::Brain::Client).to receive(:new).and_return(client)
    client
  end

  def stub_capture_failure(message: 'gbrain exploded')
    client = instance_double(Algorythmo::Brain::Client)
    allow(client).to receive(:capture).and_raise(RuntimeError, message)
    allow(Algorythmo::Brain::Client).to receive(:new).and_return(client)
    client
  end

  def stub_write_lock_passthrough
    allow(Algorythmo::Brain::WriteLock).to receive(:with_lock) { |**_kwargs, &blk| blk.call }
  end

  def stub_write_lock_contended
    allow(Algorythmo::Brain::WriteLock).to receive(:with_lock)
      .and_raise(Algorythmo::Brain::WriteLock::LockContended, 'held by another process')
  end

  after { Current.reset }

  describe 'success path' do
    it 'captures the document and marks it captured with brain_page_path' do
      stub_write_lock_passthrough
      stub_capture_success(page_path: '/brain/documents/42.md')

      worker.perform(account.id, document.id)

      document.reload
      aggregate_failures do
        expect(document).to be_status_captured
        expect(document.brain_page_path).to eq('/brain/documents/42.md')
        expect(document.last_error).to be_nil
      end
    end

    it 'wraps capture in WriteLock keyed by the document account' do
      stub_capture_success
      expect(Algorythmo::Brain::WriteLock).to receive(:with_lock)
        .with(account_id: account.id).and_yield

      worker.perform(account.id, document.id)
    end
  end

  describe 'idempotency' do
    it 'is a no-op when the document is already captured' do
      document.update!(status: :captured, brain_page_path: '/brain/documents/existing.md')
      expect(Algorythmo::Brain::Client).not_to receive(:new)

      worker.perform(account.id, document.id)

      expect(document.reload.brain_page_path).to eq('/brain/documents/existing.md')
    end

    it 'does nothing when the document does not exist' do
      stub_write_lock_passthrough
      expect(Algorythmo::Brain::Client).not_to receive(:new)

      expect { worker.perform(account.id, -1) }.not_to raise_error
    end
  end

  describe 'failure path' do
    it 'marks the document failed with last_error and re-raises for Sidekiq retry' do
      stub_write_lock_passthrough
      stub_capture_failure(message: 'gbrain exited 1: boom')

      expect { worker.perform(account.id, document.id) }.to raise_error(RuntimeError, 'gbrain exited 1: boom')

      document.reload
      aggregate_failures do
        expect(document).to be_status_failed
        expect(document.last_error).to include('gbrain exited 1: boom')
      end
    end

    it 'marks the document failed when extraction raises' do
      stub_write_lock_passthrough
      allow(Algorythmo::Brain::DocumentExtractor).to receive(:call)
        .and_raise(Algorythmo::Brain::DocumentExtractor::ExtractionError, 'bad pdf')

      expect { worker.perform(account.id, document.id) }.to raise_error(Algorythmo::Brain::DocumentExtractor::ExtractionError)

      expect(document.reload).to be_status_failed
    end
  end

  describe 'lock contention' do
    it 're-raises LockContended and does NOT mark the document failed' do
      stub_write_lock_contended
      allow(Algorythmo::Brain::Client).to receive(:new).and_return(instance_double(Algorythmo::Brain::Client))

      expect { worker.perform(account.id, document.id) }.to raise_error(Algorythmo::Brain::WriteLock::LockContended)

      expect(document.reload).not_to be_status_failed
    end
  end

  describe 'frontmatter safety' do
    it 'JSON-encodes a filename with a newline so it cannot inject frontmatter' do
      stub_write_lock_passthrough
      document.update!(filename: "evil\ntitulo: injected")
      captured_markdown = nil
      client = stub_capture_success
      allow(client).to receive(:capture) do |file:|
        captured_markdown = File.read(file)
        { 'page_path' => '/brain/documents/evil.md' }
      end

      worker.perform(account.id, document.id)

      front = captured_markdown[/---\n(.*?)\n---/m, 1]
      yaml = YAML.safe_load("#{front}\n")
      aggregate_failures do
        expect(yaml.keys).to contain_exactly('titulo', 'categoria', 'origem', 'data')
        expect(yaml['titulo']).to eq("evil\ntitulo: injected")
      end
    end
  end

  describe 'tmpfile hygiene' do
    it 'removes the tmpdir after a successful capture' do
      stub_write_lock_passthrough
      captured_dir = nil
      allow(Dir).to receive(:mktmpdir).and_wrap_original do |orig, *args|
        dir = orig.call(*args)
        # The worker prefixes its own tmpdir; ignore any tmpdir Active Storage opens.
        captured_dir ||= dir if args.first.to_s.start_with?('algorythmo_brain_doc_')
        dir
      end
      stub_capture_success

      worker.perform(account.id, document.id)

      expect(captured_dir).to be_present
      expect(File.exist?(captured_dir)).to be(false)
    end
  end
end
