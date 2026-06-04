# frozen_string_literal: true

# Upload pipeline for brain knowledge documents (plan 0012 §2.3, PR3).
#
# POST /brain/documents  (multipart) — validate (§4.3) → store blob → enqueue ingestion.
# GET  /brain/documents              — paginated list for the "Ver" tab.
#
# Inherits the full Brain auth chain via BaseController (auth → account → crm gate →
# tenant fail-closed). The upload is validated BEFORE the blob is persisted, so a
# hostile file never reaches storage.
#
# Role gate: Brain curation (upload / list) is admin-only. The operator consumes
# knowledge through the Copilot read-only endpoint — they do NOT curate it.
# An agent who can call POST here could poison the Brain with hostile content.
# check_admin_authorization? raises Pundit::NotAuthorizedError (→ 403) for
# non-admins; the helper lives in Api::BaseController and is used identically
# in LeadsController and StagesController.
class Algorythmo::Api::V1::Brain::DocumentsController < Algorythmo::Api::V1::Brain::BaseController
  before_action :check_admin_authorization?, only: %i[index create]

  DEFAULT_PER_PAGE = 25
  MAX_PER_PAGE     = 100

  # GET /brain/documents?page=1&per_page=25
  def index
    documents = Algorythmo::Brain::Document
                .where(account_id: current_account.id)
                .order(created_at: :desc)
                .page(page_param)
                .per(per_page_param)

    render json: {
      documents: documents.map { |doc| document_json(doc) },
      meta: {
        current_page: documents.current_page,
        total_pages: documents.total_pages,
        total_count: documents.total_count
      }
    }
  end

  # POST /brain/documents  { file, category }
  def create
    validation = Algorythmo::Brain::UploadValidator.call(upload_param)
    return render json: { error: validation.reason }, status: :unprocessable_entity unless validation.ok?
    return render json: { error: 'category is invalid' }, status: :unprocessable_entity unless category_allowed?

    document = build_document(validation)
    document.file.attach(upload_param)

    return render json: { error: document.errors.full_messages.to_sentence }, status: :unprocessable_entity unless document.save

    Algorythmo::Brain::BrainDocumentIngestionWorker.perform_async(current_account.id, document.id)
    render json: document_json(document), status: :created
  end

  private

  def build_document(validation)
    Algorythmo::Brain::Document.new(
      account_id: current_account.id,
      user_id: current_user&.id,
      filename: File.basename(upload_param.original_filename.to_s),
      content_type: validation.detected_mime,
      byte_size: upload_param.size.to_i,
      category: category_param,
      status: :pending
    )
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

  def upload_param
    params[:file]
  end

  def category_param
    params[:category].to_s
  end

  def category_allowed?
    Algorythmo::Brain::Document::CATEGORIES.include?(category_param)
  end

  def page_param
    [params[:page].to_i, 1].max
  end

  def per_page_param
    requested = params[:per_page].to_i
    return DEFAULT_PER_PAGE if requested <= 0

    [requested, MAX_PER_PAGE].min
  end
end
