# frozen_string_literal: true

class Algorythmo::Lead < ApplicationRecord
  belongs_to :account
  belongs_to :contact
  belongs_to :stage, class_name: 'Algorythmo::Stage'
  belongs_to :previous_lead, class_name: 'Algorythmo::Lead', optional: true
  belongs_to :owner, class_name: 'User', optional: true

  has_many :subsequent_leads, class_name: 'Algorythmo::Lead',
                              foreign_key: :previous_lead_id,
                              inverse_of: :previous_lead,
                              dependent: :nullify

  validates :account,  presence: true
  validates :contact,  presence: true
  validates :stage,    presence: true
  validates :position, numericality: true, allow_nil: true

  scope :active,  -> { where(deleted: false) }
  scope :open,    -> { active.joins(:stage).where(algorythmo_stages: { kind: :open }) }
  scope :closed,  -> { active.joins(:stage).where(algorythmo_stages: { kind: %i[won lost] }) }

  # algorythmo: stage_kind is denormalised from stage.kind so the partial unique index
  # idx_leads_open_unique_per_contact can use a plain WHERE clause (Postgres rejects subqueries
  # in partial-index predicates). Must be synced on every save that touches stage_id.
  before_save :sync_stage_kind
  before_create :set_stage_entered_at

  # A.4 — Move lead to a new stage.
  # Recalculates position (appended at end) and resets the aging clock (D10).
  # Raises ArgumentError if stage belongs to a different pipeline.
  def move_to_stage(new_stage)
    raise ArgumentError, 'Stage cannot be nil' if new_stage.nil?
    raise ArgumentError, 'Stage belongs to a different pipeline' if new_stage.pipeline_id != stage.pipeline_id

    update!(
      stage: new_stage,
      position: next_position_in(new_stage),
      stage_entered_at: Time.current,
      closed_at: closed_at_for(new_stage)
    )
  end

  # A.5 — Reopen a closed lead as a new lead, preserving the chain.
  # Only callable on leads in a won or lost stage.
  def reopen_as_new_lead
    raise ArgumentError, 'Can only reopen a lead that is in a won or lost stage' unless stage.won? || stage.lost?

    pipeline = stage.pipeline
    novo_stage = pipeline.stages.open.order(:position).first
    raise ArgumentError, 'Pipeline has no open stage' unless novo_stage

    new_position = (self.class.where(stage: novo_stage, deleted: false).maximum(:position) || 0.0) + 1.0

    self.class.create!(
      account: account,
      contact: contact,
      stage: novo_stage,
      position: new_position,
      previous_lead_id: id,
      channel_origin: channel_origin,
      channel_metadata: channel_metadata,
      stage_entered_at: Time.current
    )
  end

  private

  def next_position_in(target_stage)
    max_position = self.class.where(stage: target_stage, deleted: false)
                       .where.not(id: id)
                       .maximum(:position)
    (max_position || 0.0) + 1.0
  end

  def closed_at_for(new_stage)
    return Time.current if new_stage.won? || new_stage.lost?
    return nil if (stage.won? || stage.lost?) && new_stage.open?

    closed_at
  end

  def set_stage_entered_at
    self.stage_entered_at ||= Time.current
  end

  def sync_stage_kind
    # Use kind_before_type_cast to read the raw integer stored in the DB column
    # without going through the enum string mapping — avoids a round-trip when stage
    # is already loaded in memory. Falls back to 0 (open) if stage is somehow nil.
    self.stage_kind = stage&.kind_before_type_cast.to_i
  end
end
