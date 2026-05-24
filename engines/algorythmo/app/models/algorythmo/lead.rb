# frozen_string_literal: true

class Algorythmo::Lead < ApplicationRecord
  belongs_to :account
  belongs_to :contact
  belongs_to :stage, class_name: 'Algorythmo::Stage'
  belongs_to :previous_lead, class_name: 'Algorythmo::Lead', optional: true

  has_many :subsequent_leads, class_name: 'Algorythmo::Lead',
                              foreign_key: :previous_lead_id,
                              inverse_of: :previous_lead,
                              dependent: :nullify

  has_many :stage_histories, class_name: 'Algorythmo::StageHistory',
                             inverse_of: :lead,
                             dependent: :destroy

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

  # §5.4 — Ghost-history defence: stage_id can only change via move_to_stage.
  # Direct update!(stage_id:) from rake tasks, console, or future jobs is blocked
  # here so that StageHistory always reflects the canonical move path.
  attr_accessor :_via_move_to_stage
  before_update :guard_stage_id_change

  # §6.3 — Record stage transition after the move commits. Runs after_commit so a
  # history insert failure never rolls back the committed stage change.
  after_update_commit :record_stage_transition, if: :saved_change_to_stage_id?

  # A.4 — Move lead to a new stage.
  # Recalculates position (appended at end) and resets the aging clock (D10).
  # Raises ArgumentError if stage belongs to a different pipeline.
  # Sets _via_move_to_stage so the guard allows the stage_id change.
  def move_to_stage(new_stage)
    raise ArgumentError, 'Stage cannot be nil' if new_stage.nil?
    raise ArgumentError, 'Stage belongs to a different pipeline' if new_stage.pipeline_id != stage.pipeline_id

    self._via_move_to_stage = true
    update!(
      stage: new_stage,
      position: next_position_in(new_stage),
      stage_entered_at: Time.current,
      closed_at: closed_at_for(new_stage)
    )
  ensure
    self._via_move_to_stage = false
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

  # §5.4 — Blocks any update that changes stage_id outside of move_to_stage.
  # Raises via throw :abort so ActiveRecord surfaces ActiveRecord::RecordInvalid.
  def guard_stage_id_change
    return unless stage_id_changed?
    return if _via_move_to_stage

    errors.add(:stage_id, 'só pode ser modificado via Lead#move_to_stage')
    throw :abort
  end

  # §6.3 — Called after_update_commit when stage_id changed.
  # Reads from saved_change_to_stage_id to resolve both Stage objects.
  def record_stage_transition
    from_id, to_id = saved_change_to_stage_id
    from_stage = from_id ? Algorythmo::Stage.find_by(id: from_id) : nil
    to_stage   = Algorythmo::Stage.find_by(id: to_id)
    return unless to_stage

    Algorythmo::StageHistoryRecorder.record_transition(self, from: from_stage, to: to_stage)
  end

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
