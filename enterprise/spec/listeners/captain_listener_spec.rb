# frozen_string_literal: true

require 'rails_helper'

# M0.5 — Camada 1: Captain listener feature gate
# Verifies that CaptainListener respects the algorythmo_show_captain flag.
RSpec.describe CaptainListener, type: :listener do
  let(:listener) { described_class.instance }
  let(:account) { create(:account) }
  let(:inbox) { create(:inbox, account: account) }
  let(:conversation) { create(:conversation, account: account, inbox: inbox) }
  let(:event) { OpenStruct.new(data: { conversation: conversation }) }

  before do
    # Default any other feature flag check (e.g. ip_lookup from Contact creation)
    # to false so partial stubs below don't raise MissingStubError.
    allow_any_instance_of(Account).to receive(:feature_enabled?).and_return(false)
  end

  describe '#conversation_resolved' do
    context 'when algorythmo_show_captain flag is disabled (default)' do
      before do
        # Feature disabled — default state for all Algorythmo OS accounts.
        # Stub on the class level to catch any Account instance (including lazy-loaded
        # conversation.account which may be a different Ruby object than `account`).
        allow_any_instance_of(Account).to receive(:feature_enabled?)
          .with('algorythmo_show_captain').and_return(false)
      end

      it 'returns early without calling any Captain AI services' do
        expect(Captain::Llm::ContactNotesService).not_to receive(:new)
        expect(Captain::Llm::ConversationFaqService).not_to receive(:new)

        listener.conversation_resolved(event)
      end

      it 'does not check captain_active? on the inbox' do
        # Force lazy resolution of conversation/event BEFORE setting the message
        # expectation — conversation creation calls inbox.active_bot? which
        # calls captain_active? as part of Rails determine_conversation_status,
        # which is unrelated to the listener under test.
        event

        expect(inbox).not_to receive(:captain_active?)

        listener.conversation_resolved(event)
      end
    end

    context 'when algorythmo_show_captain flag is enabled' do
      before do
        allow_any_instance_of(Account).to receive(:feature_enabled?)
          .with('algorythmo_show_captain').and_return(true)
      end

      context 'when the inbox is not captain_active' do
        before do
          allow(inbox).to receive(:captain_active?).and_return(false)
          allow(inbox).to receive(:captain_assistant).and_return(nil)
        end

        it 'returns early before calling AI services' do
          expect(Captain::Llm::ContactNotesService).not_to receive(:new)
          expect(Captain::Llm::ConversationFaqService).not_to receive(:new)

          listener.conversation_resolved(event)
        end
      end

      context 'when the inbox is captain_active with an assistant configured for memory + faq' do
        let(:assistant) { double('Captain::Assistant', config: { 'feature_memory' => true, 'feature_faq' => true }) }
        let(:notes_service) { double('ContactNotesService') }
        let(:faq_service) { double('ConversationFaqService') }

        before do
          allow(inbox).to receive(:captain_active?).and_return(true)
          allow(inbox).to receive(:captain_assistant).and_return(assistant)
          allow(Captain::Llm::ContactNotesService).to receive(:new).with(assistant, conversation).and_return(notes_service)
          allow(Captain::Llm::ConversationFaqService).to receive(:new).with(assistant, conversation).and_return(faq_service)
          allow(notes_service).to receive(:generate_and_update_notes)
          allow(faq_service).to receive(:generate_and_deduplicate)
        end

        it 'calls both AI services' do
          expect(notes_service).to receive(:generate_and_update_notes)
          expect(faq_service).to receive(:generate_and_deduplicate)

          listener.conversation_resolved(event)
        end
      end
    end
  end
end
