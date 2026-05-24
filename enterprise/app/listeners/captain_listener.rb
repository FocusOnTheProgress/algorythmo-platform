class CaptainListener < BaseListener
  include ::Events::Types

  def conversation_resolved(event)
    conversation, account = extract_conversation_and_account(event)

    # algorythmo: feature-gate algorythmo_show_captain
    # When the Algorythmo OS Captain gate is off (the default), Captain AI
    # features are invisible to the PME client. Returning early here ensures
    # no background AI work fires for accounts that have Captain hidden.
    # Use the centralized FeatureGate so this listener shares the 30s cache
    # with the controller layer, and so flag policy lives in ONE place.
    return unless Algorythmo::FeatureGate.cut_enabled?(account, 'show_captain')

    assistant = conversation.inbox.captain_assistant

    return unless conversation.inbox.captain_active?

    Captain::Llm::ContactNotesService.new(assistant, conversation).generate_and_update_notes if assistant.config['feature_memory'].present?
    Captain::Llm::ConversationFaqService.new(assistant, conversation).generate_and_deduplicate if assistant.config['feature_faq'].present?
  end
end
