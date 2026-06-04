# frozen_string_literal: true

require 'rails_helper'
require 'tempfile'

# Covers plan 0012 §4.3 defense-in-depth: allowlist, magic-byte MIME, size ceiling,
# filename sanitization, empty/0-byte, and the .exe-renamed-.pdf hostile case.
RSpec.describe Algorythmo::Brain::UploadValidator do
  # Minimal valid PDF (header magic bytes %PDF-1.4 + trivial structure).
  PDF_BYTES = "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"
  # Windows PE executable magic ("MZ" header) — what a renamed .exe really is.
  EXE_BYTES = "MZ\x90\x00\x03\x00\x00\x00".b

  def upload_for(content, filename:)
    tempfile = Tempfile.new(['upload', File.extname(filename)])
    tempfile.binmode
    tempfile.write(content)
    tempfile.rewind
    ActionDispatch::Http::UploadedFile.new(
      tempfile: tempfile,
      filename: filename,
      type: 'application/octet-stream'
    )
  end

  describe 'allowlist of extension' do
    it 'accepts a .txt upload' do
      result = described_class.call(upload_for('hello world', filename: 'notes.txt'))
      expect(result).to be_ok
    end

    it 'accepts a .md upload' do
      result = described_class.call(upload_for("# title\nbody", filename: 'doc.md'))
      expect(result).to be_ok
    end

    it 'accepts a .pdf upload with real PDF bytes' do
      result = described_class.call(upload_for(PDF_BYTES, filename: 'report.pdf'))
      expect(result).to be_ok
    end

    it 'rejects a disallowed extension (.svg)' do
      result = described_class.call(upload_for('<svg></svg>', filename: 'logo.svg'))
      aggregate_failures do
        expect(result).not_to be_ok
        expect(result.reason).to include('not allowed')
      end
    end

    it 'rejects a file with no extension' do
      result = described_class.call(upload_for('data', filename: 'README'))
      expect(result).not_to be_ok
    end
  end

  describe 'magic-byte MIME (not the client content-type)' do
    it 'rejects a Windows executable renamed to .pdf' do
      result = described_class.call(upload_for(EXE_BYTES, filename: 'invoice.pdf'))
      aggregate_failures do
        expect(result).not_to be_ok
        expect(result.reason).to include('not permitted')
      end
    end

    it 'rejects a Windows executable renamed to .txt' do
      result = described_class.call(upload_for(EXE_BYTES, filename: 'readme.txt'))
      expect(result).not_to be_ok
    end
  end

  describe 'size ceiling' do
    it 'rejects a file over 10 MiB' do
      oversize = 'a' * (Algorythmo::Brain::Document::MAX_BYTE_SIZE + 1)
      result = described_class.call(upload_for(oversize, filename: 'big.txt'))
      aggregate_failures do
        expect(result).not_to be_ok
        expect(result.reason).to include('exceeds')
      end
    end

    it 'rejects a 0-byte file' do
      result = described_class.call(upload_for('', filename: 'empty.txt'))
      aggregate_failures do
        expect(result).not_to be_ok
        expect(result.reason).to include('empty')
      end
    end
  end

  describe 'filename sanitization' do
    it 'rejects a path-traversal filename' do
      result = described_class.call(upload_for('x', filename: '../../etc/passwd.txt'))
      aggregate_failures do
        expect(result).not_to be_ok
        expect(result.reason).to include('invalid')
      end
    end

    it 'rejects a filename containing a null byte' do
      result = described_class.call(upload_for('x', filename: "evil\0.txt"))
      expect(result).not_to be_ok
    end

    it 'rejects a filename containing a path separator' do
      result = described_class.call(upload_for('x', filename: 'sub/dir.txt'))
      expect(result).not_to be_ok
    end
  end

  describe 'no file' do
    it 'rejects a nil upload' do
      result = described_class.call(nil)
      aggregate_failures do
        expect(result).not_to be_ok
        expect(result.reason).to include('no file')
      end
    end
  end
end
