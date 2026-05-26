# frozen_string_literal: true

require 'rails_helper'

# Covers Algorythmo::Brain::ConversationToMarkdown:
#   - YAML frontmatter completeness (all required keys present)
#   - Private messages are filtered out
#   - Messages appear in chronological order
#   - Role assignment: incoming → contact, outgoing → agent, agent_bot → bot
RSpec.describe Algorythmo::Brain::ConversationToMarkdown do
  subject(:service) { described_class }

  let(:account)  { create(:account) }
  let(:inbox)    { create(:inbox, account: account) }
  let(:contact)  { create(:contact, account: account) }

  let(:conversation) do
    create(:conversation,
           account: account,
           inbox: inbox,
           contact: contact,
           status: 'resolved')
  end

  # Build a message directly so we can control private flag and ordering.
  def build_message(conversation:, content:, message_type: 'incoming', private: false, created_at: Time.current)
    create(:message,
           conversation: conversation,
           account: account,
           inbox: inbox,
           content: content,
           message_type: message_type,
           private: private,
           created_at: created_at)
  end

  # ---------------------------------------------------------------------------
  # Frontmatter completeness
  # ---------------------------------------------------------------------------
  describe 'YAML frontmatter' do
    let(:output) { service.call(conversation) }

    let(:frontmatter_yaml) do
      match = output.match(/\A---\n(.*?)---\n/m)
      YAML.safe_load(match[1])
    end

    it 'includes all required keys' do
      aggregate_failures do
        expect(frontmatter_yaml).to have_key('conversation_id')
        expect(frontmatter_yaml).to have_key('account_id')
        expect(frontmatter_yaml).to have_key('status')
        expect(frontmatter_yaml).to have_key('channel')
        expect(frontmatter_yaml).to have_key('inbox_name')
        expect(frontmatter_yaml).to have_key('contact_name')
        expect(frontmatter_yaml).to have_key('agent_names')
        expect(frontmatter_yaml).to have_key('created_at')
        expect(frontmatter_yaml).to have_key('resolved_at')
        expect(frontmatter_yaml).to have_key('tags')
      end
    end

    it 'sets conversation_id and account_id to correct values' do
      aggregate_failures do
        expect(frontmatter_yaml['conversation_id']).to eq(conversation.id)
        expect(frontmatter_yaml['account_id']).to eq(account.id)
      end
    end

    it 'sets status to resolved' do
      expect(frontmatter_yaml['status']).to eq('resolved')
    end

    it 'sets contact_name from the conversation contact' do
      expect(frontmatter_yaml['contact_name']).to eq(contact.name)
    end

    it 'tags is an array (empty when no labels)' do
      expect(frontmatter_yaml['tags']).to be_an(Array)
    end

    it 'splits cached_label_list CSV into individual tags' do
      # cached_label_list is a text column holding a CSV — must split, not Array().
      allow(conversation).to receive(:cached_label_list).and_return('sales, priority,vip')
      output = service.call(conversation)
      tags = YAML.safe_load(output.match(/\A---\n(.*?)---\n/m)[1])['tags']
      expect(tags).to eq(%w[sales priority vip])
    end

    it 'agent_names includes every user who sent an outgoing message, not just the assignee' do
      agent_a = create(:user, account_ids: [account.id])
      agent_b = create(:user, account_ids: [account.id])

      create(:message,
             conversation: conversation, account: account, inbox: inbox,
             message_type: 'outgoing', sender: agent_a, content: 'hi from A')
      create(:message,
             conversation: conversation, account: account, inbox: inbox,
             message_type: 'outgoing', sender: agent_b, content: 'hi from B')

      output = service.call(conversation)
      agents = YAML.safe_load(output.match(/\A---\n(.*?)---\n/m)[1])['agent_names']

      expect(agents).to contain_exactly(agent_a.name, agent_b.name)
    end
  end

  # ---------------------------------------------------------------------------
  # Private message filtering
  # ---------------------------------------------------------------------------
  describe 'private message filtering' do
    it 'excludes messages with private: true from the body' do
      build_message(conversation: conversation, content: 'Hello customer', message_type: 'incoming')
      build_message(conversation: conversation, content: 'Internal note — do not surface', private: true)
      build_message(conversation: conversation, content: 'Thanks for reaching out', message_type: 'outgoing')

      output = service.call(conversation)

      aggregate_failures do
        expect(output).to include('Hello customer')
        expect(output).to include('Thanks for reaching out')
        expect(output).not_to include('Internal note')
      end
    end

    it 'produces an empty body when all messages are private' do
      # Chatwoot's inbox factory inserts welcome messages on conversation create —
      # strip them so the assertion isolates the private-only invariant.
      conversation.messages.delete_all
      build_message(conversation: conversation, content: 'Secret note', private: true)
      output = service.call(conversation)

      # Frontmatter block ends at second "---"; nothing else after the blank line
      body = output.split("---\n").last.to_s.strip
      expect(body).to be_empty
    end
  end

  # ---------------------------------------------------------------------------
  # Chronological ordering
  # ---------------------------------------------------------------------------
  describe 'chronological ordering' do
    it 'renders messages in ascending created_at order regardless of creation order in DB' do
      t_base = Time.current.beginning_of_hour

      msg_third  = build_message(conversation: conversation, content: 'Third',  created_at: t_base + 2.minutes)
      msg_first  = build_message(conversation: conversation, content: 'First',  created_at: t_base)
      msg_second = build_message(conversation: conversation, content: 'Second', created_at: t_base + 1.minute)

      # Reassign to suppress unused variable warnings (ordering is what we test)
      _ = [msg_third, msg_first, msg_second]

      output = service.call(conversation)
      body = output.split("---\n").last.to_s

      first_pos  = body.index('First')
      second_pos = body.index('Second')
      third_pos  = body.index('Third')

      aggregate_failures do
        expect(first_pos).to be < second_pos
        expect(second_pos).to be < third_pos
      end
    end
  end

  # ---------------------------------------------------------------------------
  # Role assignment
  # ---------------------------------------------------------------------------
  describe 'role assignment' do
    it 'labels incoming messages as contact' do
      build_message(conversation: conversation, content: 'Hi there', message_type: 'incoming')
      output = service.call(conversation)
      expect(output).to include('contact: Hi there')
    end

    it 'labels outgoing messages from a human as agent' do
      build_message(conversation: conversation, content: 'We will look into it', message_type: 'outgoing')
      output = service.call(conversation)
      expect(output).to include('agent: We will look into it')
    end
  end
end
