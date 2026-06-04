# frozen_string_literal: true

require 'rails_helper'
require 'tmpdir'
require 'zip'

# Covers plan 0012 §4.3 extraction per type. TEXT-ONLY: md/txt as-is, PDF text layer,
# docx word/document.xml text nodes. No rendering, no macro execution.
RSpec.describe Algorythmo::Brain::DocumentExtractor do
  around do |example|
    Dir.mktmpdir('extractor_spec_') do |dir|
      @dir = dir
      example.run
    end
  end

  def write(name, content, binary: false)
    path = File.join(@dir, name)
    File.open(path, binary ? 'wb' : 'w') { |f| f.write(content) }
    path
  end

  describe 'plain text types' do
    it 'returns .md content as-is' do
      path = write('doc.md', "# Title\n\nBody text.")
      result = described_class.call(blob_path: path, content_type: 'text/markdown')
      expect(result).to eq("# Title\n\nBody text.")
    end

    it 'returns .txt content as-is' do
      path = write('doc.txt', "line one\nline two")
      result = described_class.call(blob_path: path, content_type: 'text/plain')
      expect(result).to eq("line one\nline two")
    end

    it 'scrubs invalid UTF-8 rather than raising' do
      path = write('doc.txt', "valid\xFF\xFEtext".b, binary: true)
      expect { described_class.call(blob_path: path, content_type: 'text/plain') }.not_to raise_error
    end
  end

  describe 'docx' do
    # Builds a real .docx: a zip whose word/document.xml carries two paragraphs.
    def build_docx(name, paragraphs)
      runs = paragraphs.map { |p| "<w:p><w:r><w:t>#{p}</w:t></w:r></w:p>" }.join
      xml = <<~XML
        <?xml version="1.0"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>#{runs}</w:body>
        </w:document>
      XML
      path = File.join(@dir, name)
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
      path = File.join(@dir, 'broken.docx')
      Zip::File.open(path, create: true) { |zip| zip.get_output_stream('other.xml') { |os| os.write('x') } }

      expect do
        described_class.call(blob_path: path, content_type: 'application/zip')
      end.to raise_error(Algorythmo::Brain::DocumentExtractor::ExtractionError, /missing word\/document\.xml/)
    end
  end

  describe 'pdf' do
    # A minimal but structurally valid single-page PDF carrying the text "Hello PDF".
    def build_pdf(name)
      content = "BT /F1 24 Tf 100 700 Td (Hello PDF) Tj ET"
      objects = []
      objects << '<< /Type /Catalog /Pages 2 0 R >>'
      objects << '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'
      objects << '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ' \
                 '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>'
      objects << "<< /Length #{content.bytesize} >>\nstream\n#{content}\nendstream"
      objects << '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'

      body = +"%PDF-1.4\n"
      offsets = []
      objects.each_with_index do |obj, i|
        offsets << body.bytesize
        body << "#{i + 1} 0 obj\n#{obj}\nendobj\n"
      end
      xref_start = body.bytesize
      body << "xref\n0 #{objects.size + 1}\n0000000000 65535 f \n"
      offsets.each { |off| body << format("%010d 00000 n \n", off) }
      body << "trailer\n<< /Size #{objects.size + 1} /Root 1 0 R >>\nstartxref\n#{xref_start}\n%%EOF\n"

      path = File.join(@dir, name)
      File.open(path, 'wb') { |f| f.write(body) }
      path
    end

    it 'extracts the text layer' do
      path = build_pdf('doc.pdf')
      result = described_class.call(blob_path: path, content_type: 'application/pdf')
      expect(result).to include('Hello PDF')
    end
  end

  describe 'unsupported type' do
    it 'raises UnsupportedType for an extension with no extractor' do
      path = write('doc.csv', 'a,b,c')
      expect do
        described_class.call(blob_path: path, content_type: 'text/csv')
      end.to raise_error(Algorythmo::Brain::DocumentExtractor::UnsupportedType)
    end
  end
end
