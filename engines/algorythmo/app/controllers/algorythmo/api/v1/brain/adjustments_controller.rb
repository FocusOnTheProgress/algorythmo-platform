# frozen_string_literal: true

# POST /brain/adjustments — "colar conhecimento" (plan 0012 §6, PR4).
#
# Accepts raw text/markdown pasted by the admin and ingests it into the brain by
# reusing the existing Document + BrainDocumentIngestionWorker pipeline (DRY).
#
# Why BrainDocumentIngestionWorker instead of a new RawMarkdownIngestionWorker:
#   The worker pipeline (download blob → extract → frontmatter → capture under
#   WriteLock → snapshot best-effort) is entirely content-type-driven: a .md blob
#   routed through DocumentExtractor is read as-is (no transformation). Attaching
#   the pasted text as a StringIO blob with content_type 'text/markdown' and a .md
#   filename gives us the same path end-to-end with zero new worker code.
#   A new RawMarkdownIngestionWorker would duplicate 95% of this logic — the plan's
#   P2 note recommended it only as a fallback when the existing worker couldn't
#   accommodate text without a conversation_id.  The BrainDocumentIngestionWorker
#   has no such dependency; the old IngestionWorker (conversations) does.
#
# Role gate: admin-only — same gate applied in DocumentsController (plan §4.3/P1-A).
# An agent who can POST here could poison the Brain with arbitrary content.
# check_admin_authorization? raises Pundit::NotAuthorizedError → 401/403.
#
# Validation (before any write):
#   - content must be present and a String
#   - content size ≤ MAX_CONTENT_BYTES (1 MiB of text)
#   - content is scrubbed to valid UTF-8 (invalid byte sequences replaced)
#   - title, when present, is stripped and capped at 200 chars
#
# The Document is created with:
#   category: "ajuste"  — the dedicated category for pasted adjustments
#   filename: "ajuste-<timestamp>.md"
#   blob: the scrubbed content attached via StringIO (no UploadValidator — the
#         content is ours, magic-byte checks for hostile uploads do not apply here)
#
# On success → 201 with the document JSON (same shape as DocumentsController).
# Worker runs asynchronously; the document starts as status: pending.
class Algorythmo::Api::V1::Brain::AdjustmentsController < Algorythmo::Api::V1::Brain::BaseController
  before_action :check_admin_authorization?

  # 1 MiB — large enough for any real knowledge paste, small enough to bound
  # the size of the tmpfile the worker writes before calling capture.
  MAX_CONTENT_BYTES = 1 * 1024 * 1024

  CATEGORY = 'ajuste'

  # POST /brain/adjustments  { content: <markdown>, title?: <string> }
  def create
    content = extract_content
    return render json: { error: 'content is required' }, status: :unprocessable_entity if content.nil?

    scrubbed = content.scrub
    if scrubbed.empty?
      return render json: { error: 'content cannot be blank' }, status: :unprocessable_entity
    end

    if scrubbed.bytesize > MAX_CONTENT_BYTES
      return render json: { error: 'content exceeds 1 MB limit' }, status: :unprocessable_entity
    end

    document = build_document(scrubbed)
    attach_blob(document, scrubbed)

    unless document.save
      return render json: { error: document.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end

    Algorythmo::Brain::BrainDocumentIngestionWorker.perform_async(current_account.id, document.id)
    render json: document_json(document), status: :created
  end

  private

  def extract_content
    raw = params[:content]
    return nil unless raw.is_a?(String)

    raw
  end

  def title_param
    raw = params[:title]
    return nil unless raw.is_a?(String)

    raw.strip.truncate(200).presence
  end

  def build_document(content)
    filename = derived_filename
    Algorythmo::Brain::Document.new(
      account_id: current_account.id,
      user_id: current_user&.id,
      filename: filename,
      content_type: 'text/markdown',
      byte_size: content.bytesize,
      category: CATEGORY,
      status: :pending
    )
  end

  def attach_blob(document, content)
    filename = document.filename
    document.file.attach(
      io: StringIO.new(content),
      filename: filename,
      content_type: 'text/markdown'
    )
  end

  # Produces a filename that is stable within a second and self-describing.
  # The title (when given) is slugified for readability; fallback is the
  # ISO-8601 timestamp which is unique enough for async ingestion.
  def derived_filename
    base = title_param ? slugify(title_param) : Time.current.strftime('%Y%m%dT%H%M%S')
    "ajuste-#{base}.md"
  end

  # ASCII-safe slug: lowercase, replace non-alphanumeric runs with hyphens,
  # strip leading/trailing hyphens, cap at 60 chars to keep filenames readable.
  def slugify(str)
    str.downcase
       .gsub(/[^a-z0-9]+/, '-')
       .gsub(/\A-+|-+\z/, '')
       .slice(0, 60)
       .presence || Time.current.strftime('%Y%m%dT%H%M%S')
  end

  def document_json(doc)
    {
      id: doc.id,
      filename: doc.filename,
      content_type: doc.content_type,
      byte_size: doc.byte_size,
      category: doc.category,
      status: doc.status,
      brain_page_path: doc.brain_page_path,
      last_error: doc.last_error,
      created_at: doc.created_at,
      updated_at: doc.updated_at
    }
  end
end
