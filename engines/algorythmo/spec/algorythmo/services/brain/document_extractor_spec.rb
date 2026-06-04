# frozen_string_literal: true

require 'rails_helper'
require 'tmpdir'
require 'zip'

# Covers plan 0012 §4.3 extraction per type. TEXT-ONLY: md/txt as-is, PDF text layer,
# docx word/document.xml text nodes. No rendering, no macro execution.
RSpec.describe Algorythmo::Brain::DocumentExtractor do
  # let-held tmpdir avoids RSpec/InstanceVariable. Cleaned up after each example.
  let(:tmpdir) { Dir.mktmpdir('extractor_spec_') }

  after { FileUtils.rm_rf(tmpdir) }

  def write_text(name, content)
    path = File.join(tmpdir, name)
    File.write(path, content)
    path
  end

  def write_binary(name, content)
    path = File.join(tmpdir, name)
    File.binwrite(path, content)
    path
  end

  describe 'plain text types' do
    it 'returns .md content as-is' do
      path = write_text('doc.md', "# Title\n\nBody text.")
      result = described_class.call(blob_path: path, content_type: 'text/markdown')
      expect(result).to eq("# Title\n\nBody text.")
    end

    it 'returns .txt content as-is' do
      path = write_text('doc.txt', "line one\nline two")
      result = described_class.call(blob_path: path, content_type: 'text/plain')
      expect(result).to eq("line one\nline two")
    end

    it 'scrubs invalid UTF-8 rather than raising' do
      path = write_binary('doc.txt', "valid\xFF\xFEtext".b)
      expect { described_class.call(blob_path: path, content_type: 'text/plain') }.not_to raise_error
    end
  end

  describe 'docx' do
    def build_docx(name, paragraphs)
      runs = paragraphs.map { |p| "<w:p><w:r><w:t>#{p}</w:t></w:r></w:p>" }.join
      xml = <<~XML
        <?xml version="1.0"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>#{runs}</w:body>
        </w:document>
      XML
      path = File.join(tmpdir, name)
      Zip::File.open(path, create: true) do |zip|
        zip.get_output_stream('word/document.xml') { |os| os.write(xml) }
      end
      path
    end

    it 'extracts paragraph text, separated by blank lines' do
      path = build_docx('doc.docx', ['First paragraph.', 'Second paragraph.'])
      result = described_class.call(blob_path: path, content_type: 'application/zip')
      expect(result).to eq("First paragraph.\n\nSecond paragraph.")
    end

    it 'raises ExtractionError when word/document.xml is missing' do
      path = File.join(tmpdir, 'broken.docx')
      Zip::File.open(path, create: true) { |zip| zip.get_output_stream('other.xml') { |os| os.write('x') } }

      expect do
        described_class.call(blob_path: path, content_type: 'application/zip')
      end.to raise_error(Algorythmo::Brain::DocumentExtractor::ExtractionError, %r{missing word/document\.xml})
    end
  end

  describe 'pdf' do
    # A minimal structurally valid single-page PDF carrying the text "Hello PDF".
    # Helpers split to keep each method within AbcSize + MethodLength limits.

    PDF_CONTENT = 'BT /F1 24 Tf 100 700 Td (Hello PDF) Tj ET'

    def pdf_object_strings
      [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' \
        '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
        "<< /Length #{PDF_CONTENT.bytesize} >>\nstream\n#{PDF_CONTENT}\nendstream",
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
      ]
    end

    def pdf_body_with_objects(objects)
      body = +"%PDF-1.4\n"
      offsets = []
      objects.each_with_index do |obj, i|
        offsets << body.bytesize
        body << "#{i + 1} 0 obj\n#{obj}\nendobj\n"
      end
      [body, offsets]
    end

    def pdf_xref_and_trailer(body, objects, offsets)
      xref_start = body.bytesize
      body << "xref\n0 #{objects.size + 1}\n0000000000 65535 f \n"
      offsets.each { |off| body << format('%010d 00000 n ', off) << "\n" }
      body << "trailer\n<< /Size #{objects.size + 1} /Root 1 0 R >>\nstartxref\n#{xref_start}\n%%EOF\n"
    end

    def build_pdf_bytes
      objects = pdf_object_strings
      body, offsets = pdf_body_with_objects(objects)
      pdf_xref_and_trailer(body, objects, offsets)
      body
    end

    it 'extracts the text layer' do
      path = write_binary('doc.pdf', build_pdf_bytes)
      result = described_class.call(blob_path: path, content_type: 'application/pdf')
      expect(result).to include('Hello PDF')
    end
  end

  describe 'unsupported type' do
    it 'raises UnsupportedType for an extension with no extractor' do
      path = write_text('doc.csv', 'a,b,c')
      expect do
        described_class.call(blob_path: path, content_type: 'text/csv')
      end.to raise_error(Algorythmo::Brain::DocumentExtractor::UnsupportedType)
    end
  end
end
