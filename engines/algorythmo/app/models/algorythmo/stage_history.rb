# frozen_string_literal: true

# Immutable record of a Lead transitioning from one Stage to another.
#
# Append-only invariant: readonly? returns true once persisted — any attempt to
# update a record raises ActiveRecord::ReadOnlyRecord.
#
# actor_type identifies who triggered the transition:
#   'user'      — a human agent (Current.user.is_a?(::User))
#   'agent_bot' — an AgentBot, e.g. Manu (Current.user.is_a?(AgentBot))
#   'system'    — no request context (Sidekiq job, rake task, nil Current.user)
#
# actor_id is required for user and agent_bot actors; nil only when type is system.
# It is NOT a FK because User and AgentBot live in different tables. The leads
# controller resolves actor_summary at read time via preload.
class Algorythmo::StageHistory < Algorythmo::ApplicationRecord
  ACTOR_TYPES = %w[agent_bot system user].freeze

  belongs_to :lead,       class_name: 'Algorythmo::Lead'
  belongs_to :from_stage, class_name: 'Algorythmo::Stage', optional: true
  belongs_to :to_stage,   class_name: 'Algorythmo::Stage'

  validates :actor_type, inclusion: { in: ACTOR_TYPES }
  validates :actor_id, numericality: { only_integer: true, greater_than: 0, allow_nil: true }
  validate  :actor_id_required_unless_system

  def readonly?
    persisted?
  end

  private

  def actor_id_required_unless_system
    return if actor_type == 'system'

    errors.add(:actor_id, :blank) if actor_id.blank?
  end
end
