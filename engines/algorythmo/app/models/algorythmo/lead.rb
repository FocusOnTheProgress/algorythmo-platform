# frozen_string_literal: true

module Algorythmo
  class Lead < ApplicationRecord
    belongs_to :account
    belongs_to :contact
    belongs_to :stage, class_name: 'Algorythmo::Stage'
    belongs_to :previous_lead, class_name: 'Algorythmo::Lead', optional: true,
                                foreign_key: :previous_lead_id

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

    before_create :set_stage_entered_at

    # A.4 — Move lead to a new stage.
    # Recalculates position (appended at end) and resets the aging clock (D10).
    # Raises ArgumentError if stage belongs to a different pipeline.
    def move_to_stage(new_stage)
      raise ArgumentError, 'Stage cannot be nil' if new_stage.nil?
      raise ArgumentError, 'Stage belongs to a different pipeline' if new_stage.pipeline_id != stage.pipeline_id

      max_position = self.class.where(stage: new_stage, deleted: false)
                         .where.not(id: id)
                         .maximum(:position)
      new_position = (max_position || 0.0) + 1.0

      was_closed = stage.won? || stage.lost?
      new_closed_at = if new_stage.won? || new_stage.lost?
                        Time.current
                      elsif was_closed && new_stage.open?
                        nil
                      else
                        closed_at
                      end

      update!(
        stage: new_stage,
        position: new_position,
        stage_entered_at: Time.current,
        closed_at: new_closed_at
      )
    end

    # A.5 — Reopen a closed lead as a new lead, preserving the chain.
    # Only callable on leads in a won or lost stage.
    def reopen_as_new_lead
      unless stage.won? || stage.lost?
        raise ArgumentError, 'Can only reopen a lead that is in a won or lost stage'
      end

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

    def set_stage_entered_at
      self.stage_entered_at ||= Time.current
    end
  end
end
