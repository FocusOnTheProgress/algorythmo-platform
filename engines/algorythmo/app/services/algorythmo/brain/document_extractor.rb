# frozen_string_literal: true

require 'pdf-reader'
require 'zip'
require 'nokogiri'
require 'timeout'

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

      # Maximum pages extracted from a PDF.  pdf-reader iterates pages lazily, but a
      # hostile PDF can declare millions of page objects; capping the slice prevents
      # iterating a runaway page tree.  2 000 pages of dense text is already ~4 MB of
      # output — far beyond any real knowledge document.
      PDF_PAGE_LIMIT = 2_000

      # Wall-clock budget for the full PDF extraction.  A valid text-layer PDF of
      # PDF_PAGE_LIMIT pages extracts in seconds; a crafted PDF that triggers O(n²)
      # parsing in pdf-reader can spin for minutes.
      PDF_EXTRACT_TIMEOUT = 30 # seconds

      # Hard cap on bytes READ from a single docx XML member.
      #
      # Why not trust entry.size (the declared uncompressed size in the Central
      # Directory)?  Because that field is attacker-controlled.  A zip-bomb can
      # declare size = 60 MiB (below any size-check we write) while compressing to
      # a few KB; the Inflater then happily streams out 60 MiB.  To defeat this we
      # (a) keep the limit small — real docx prose XML never approaches 16 MiB —
      # and (b) use IO#read(limit+1) so the OS kernel limits actual decompressed
      # bytes, regardless of what the directory says.
      #
      # rubyzip 3.x also has Zip.validate_entry_sizes (default true): it raises
      # Zip::DecompressionSizeError when inflated bytes exceed the declared size.
      # We rescue that alongside Zip::Error so it surfaces as a clean ExtractionError.
      DOCX_MEMBER_LIMIT = 16 * 1024 * 1024

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
      #
      # Defences against hostile PDFs:
      #   - PDF_PAGE_LIMIT caps the number of pages iterated (zip-bomb-style page tree).
      #   - PDF_EXTRACT_TIMEOUT caps wall-clock time (crafted PDFs that trigger
      #     pathological parser paths).  Timeout::Error is re-raised as ExtractionError.
      def extract_pdf
        Timeout.timeout(PDF_EXTRACT_TIMEOUT) do
          reader = PDF::Reader.new(@blob_path)
          reader.pages.first(PDF_PAGE_LIMIT).map { |page| page.text.to_s.strip }.reject(&:empty?).join("\n\n")
        end
      rescue Timeout::Error
        raise ExtractionError, 'pdf extraction timed out'
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
      rescue Zip::DecompressionSizeError, Zip::Error, Nokogiri::XML::SyntaxError => e
        raise ExtractionError, "docx extraction failed: #{e.message}"
      end

      def read_docx_body
        Zip::File.open(@blob_path) do |zip|
          entry = zip.find_entry(DOCX_BODY)
          raise ExtractionError, 'docx is missing word/document.xml' if entry.nil?

          # Read at most DOCX_MEMBER_LIMIT + 1 bytes from the decompressed stream.
          # Using IO#read(n) caps the bytes the Inflater actually materialises in
          # memory, regardless of the declared size in the zip directory.  If we
          # get back more than the limit the file is pathological → reject it.
          data = entry.get_input_stream.read(DOCX_MEMBER_LIMIT + 1)
          raise ExtractionError, 'docx body exceeds inflate limit' if data.bytesize > DOCX_MEMBER_LIMIT

          data
        end
      end
    end
  end
end
