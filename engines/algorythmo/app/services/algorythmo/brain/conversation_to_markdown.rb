# frozen_string_literal: true

module Algorythmo
  module Brain
    # Converts a Chatwoot Conversation to markdown for GBrain ingestion.
    #
    # Output: YAML frontmatter + message body.
    # Security: private: true messages (internal notes) are filtered — they must NOT
    # reach the brain. Leaking team commentary to the knowledge base violates the
    # expectation under which those notes were written.
    class ConversationToMarkdown
      def self.call(conversation)
        new(conversation).call
      end

      def initialize(conversation)
        @conversation = conversation
      end

      def call
        [frontmatter, '', message_body].join("\n")
      end

      private

      attr_reader :conversation

      def frontmatter
        data = {
          'conversation_id' => conversation.id,
          'account_id' => conversation.account_id,
          'status' => conversation.status.to_s,
          'channel' => conversation.inbox&.channel_type.to_s,
          'inbox_name' => conversation.inbox&.name,
          'contact_name' => conversation.contact&.name,
          'agent_names' => agent_names,
          'created_at' => conversation.created_at&.iso8601,
          'resolved_at' => resolved_at,
          'tags' => tag_list
        }
        "---\n#{data.to_yaml.delete_prefix("---\n")}---"
      end

      # cached_label_list is a comma-separated text column on conversations —
      # `Array(...)` would treat it as a single-element list. Split and trim
      # so each tag is preserved individually.
      def tag_list
        conversation.cached_label_list.to_s.split(',').map(&:strip).reject(&:empty?)
      end

      # All agents who participated in the conversation, not just the current
      # assignee — a conversation re-assigned across operators should record
      # the full set so the brain captures who actually talked to the contact.
      def agent_names
        # .reorder('') strips the Message default_scope ORDER BY created_at —
        # Postgres rejects SELECT DISTINCT col when ORDER BY references a column
        # not in the select list.
        agent_ids = conversation.messages
                                .where(message_type: :outgoing, sender_type: 'User')
                                .reorder('')
                                .distinct
                                .pluck(:sender_id)
        return [] if agent_ids.empty?

        User.where(id: agent_ids).pluck(:name).compact
      end

      def resolved_at
        # Chatwoot has no dedicated resolved_at column; updated_at reflects the last status change.
        conversation.status.to_s == 'resolved' ? conversation.updated_at&.iso8601 : nil
      end

      def message_body
        public_messages.map { |msg| format_message(msg) }.join("\n\n")
      end

      def public_messages
        conversation.messages.where(private: false).order(created_at: :asc)
      end

      def format_message(message)
        time = message.created_at.strftime('%H:%M')
        "### [#{time}] #{resolve_role(message)}: #{message.content.to_s.strip}"
      end

      def resolve_role(message)
        case message.message_type.to_s
        when 'incoming' then 'contact'
        when 'outgoing' then message.sender_type == 'AgentBot' ? 'bot' : 'agent'
        else 'agent'
        end
      end
    end
  end
end
