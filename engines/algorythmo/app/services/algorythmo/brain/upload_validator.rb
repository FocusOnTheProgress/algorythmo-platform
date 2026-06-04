# frozen_string_literal: true

require 'marcel'

module Algorythmo
  module Brain
    # Defense-in-depth validation of an uploaded document BEFORE anything touches
    # disk or Active Storage (plan 0012 §4.3). Returns a Result; never raises on
    # hostile input — the controller maps a failed Result to 422.
    #
    # Order of checks (cheapest / most decisive first):
    #   1. presence            — an upload field must actually be present
    #   2. filename sanity      — no traversal, no null byte, no "..", non-empty basename
    #   3. extension allowlist  — .pdf .docx .md .txt only
    #   4. size ceiling         — <= 10 MiB (rejected before we read the whole body)
    #   5. real MIME by content — Marcel magic-byte sniff, NOT the client content-type;
    #                             a .exe renamed .pdf is caught here
    #
    # The client-supplied content_type is never trusted for the security decision;
    # it is only echoed onto the persisted record after the content sniff passes.
    class UploadValidator
      # docx is a ZIP container, so a structurally valid docx sniffs as either the
      # OOXML wordprocessing type OR plain application/zip depending on the magic-byte
      # database. Both are accepted for the .docx extension; the extractor then verifies
      # the zip actually contains word/document.xml.
      EXTENSION_MIME = {
        '.pdf'  => ['application/pdf'].freeze,
        '.docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'].freeze,
        '.md'   => ['text/plain', 'text/markdown', 'text/x-markdown', 'application/octet-stream'].freeze,
        '.txt'  => ['text/plain', 'application/octet-stream'].freeze
      }.freeze

      # Binary signatures that must never slip through under a text extension. If the
      # magic-byte sniff returns one of these for a .md/.txt upload, it is rejected even
      # though text types legitimately sniff as octet-stream.
      EXECUTABLE_MIMES = %w[
        application/x-msdownload application/x-dosexec application/x-executable
        application/x-mach-binary application/x-elf application/x-sharedlib
      ].freeze

      Result = Struct.new(:ok, :reason, :extension, :detected_mime, keyword_init: true) do
        def ok? = ok
      end

      # @param upload [ActionDispatch::Http::UploadedFile, #original_filename, #tempfile, #size]
      def self.call(upload)
        new(upload).call
      end

      def initialize(upload)
        @upload = upload
      end

      def call
        return failure('no file provided') if @upload.blank?

        filename = @upload.original_filename.to_s
        return failure('filename is invalid') unless safe_filename?(filename)

        extension = File.extname(filename).downcase
        return failure("extension #{extension.presence || '(none)'} not allowed") unless EXTENSION_MIME.key?(extension)

        size = @upload.size.to_i
        return failure('file is empty') if size.zero?
        return failure("file exceeds #{Document::MAX_BYTE_SIZE} bytes") if size > Document::MAX_BYTE_SIZE

        detected = detect_mime(filename)
        return failure("content type #{detected} is not permitted") unless mime_allowed?(extension, detected)

        Result.new(ok: true, extension: extension, detected_mime: detected)
      end

      private

      # A safe basename: present, no null byte, no path separators, no "..".
      # The sanitized basename is for display only — the real path on disk always
      # comes from Dir.mktmpdir, never from this string.
      def safe_filename?(name)
        return false if name.blank?
        return false if name.include?("\0")
        return false if name.include?('..')
        return false if name.include?('/') || name.include?('\\')

        File.basename(name) == name
      end

      # Magic-byte sniff of the actual bytes on disk. Marcel reads the leading bytes
      # of the tempfile; the declared name is passed only as a tie-breaker hint and
      # cannot upgrade a binary into an allowed text type because we re-check against
      # EXECUTABLE_MIMES below.
      def detect_mime(filename)
        @upload.tempfile.rewind
        Marcel::MimeType.for(@upload.tempfile, name: filename)
      ensure
        @upload.tempfile.rewind
      end

      def mime_allowed?(extension, detected)
        return false if EXECUTABLE_MIMES.include?(detected)

        EXTENSION_MIME.fetch(extension).include?(detected)
      end

      def failure(reason)
        Result.new(ok: false, reason: reason)
      end
    end
  end
end
