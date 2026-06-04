# frozen_string_literal: true

require 'pdf-reader'
require 'zip'
require 'nokogiri'

module Algorythmo
  module Brain
    # Converts an uploaded document on disk into plain text/markdown for the brain
    # (plan 0012 §4.3 / §2.3). The ONLY place third-party extraction gems are touched
    # — supply-chain surface is isolated here on purpose (PR3 supply-chain note).
    #
    # Hard rule (§4.3 #6): TEXT extraction only. We never render a PDF, never open a
    # docx as an active document, never execute a macro. PDF → text layer via pdf-reader.
    # docx → the XML text nodes of word/document.xml via rubyzip + nokogiri. md/txt → as-is.
    #
    # Content type is resolved by file EXTENSION (already validated upstream against the
    # real magic-byte MIME by UploadValidator), so a single source of truth drives routing.
    class DocumentExtractor
      class UnsupportedType < StandardError; end
      class ExtractionError < StandardError; end

      # docx member that holds the document body.
      DOCX_BODY = 'word/document.xml'

      # Cap on bytes read from a single docx XML member — a zip-bomb member that
      # inflates far beyond the 10 MiB upload ceiling is refused rather than read.
      DOCX_MEMBER_LIMIT = 64 * 1024 * 1024

      # @param blob_path [String] absolute path to the file on disk (server-owned tmpfile)
      # @param content_type [String] real MIME detected upstream (used only to pick a route
      #   when the extension is ambiguous; extension is the primary key)
      # @return [String] extracted text/markdown
      def self.call(blob_path:, content_type:)
        new(blob_path, content_type).call
      end

      def initialize(blob_path, content_type)
        @blob_path = blob_path
        @content_type = content_type.to_s
      end

      def call
        case File.extname(@blob_path).downcase
        when '.md', '.txt' then read_text
        when '.pdf'        then extract_pdf
        when '.docx'       then extract_docx
        else
          raise UnsupportedType, "no extractor for #{@blob_path.inspect} (#{@content_type})"
        end
      end

      private

      # Plain text/markdown passes through unchanged, forced to UTF-8 so a stray
      # encoding never corrupts the markdown we hand to the brain.
      def read_text
        File.read(@blob_path, encoding: 'UTF-8').scrub
      end

      # PDF text layer only. pdf-reader walks the content streams; it does not render
      # and does not evaluate embedded JavaScript. One paragraph per page.
      def extract_pdf
        reader = PDF::Reader.new(@blob_path)
        reader.pages.map { |page| page.text.to_s.strip }.reject(&:empty?).join("\n\n")
      rescue PDF::Reader::MalformedPDFError, PDF::Reader::UnsupportedFeatureError => e
        raise ExtractionError, "pdf extraction failed: #{e.message}"
      end

      # docx is a zip of XML. We read ONLY word/document.xml and pull its <w:t> text runs,
      # inserting a blank line between paragraphs (<w:p>). No styles, no embedded objects,
      # no macros — just the prose.
      def extract_docx
        xml = read_docx_body
        doc = Nokogiri::XML(xml)
        doc.remove_namespaces!

        doc.css('p').map { |para| para.css('t').map(&:text).join }
           .map(&:strip).reject(&:empty?).join("\n\n")
      rescue Zip::Error, Nokogiri::XML::SyntaxError => e
        raise ExtractionError, "docx extraction failed: #{e.message}"
      end

      def read_docx_body
        Zip::File.open(@blob_path) do |zip|
          entry = zip.find_entry(DOCX_BODY)
          raise ExtractionError, 'docx is missing word/document.xml' if entry.nil?
          raise ExtractionError, 'docx body exceeds inflate limit' if entry.size > DOCX_MEMBER_LIMIT

          entry.get_input_stream.read
        end
      end
    end
  end
end
