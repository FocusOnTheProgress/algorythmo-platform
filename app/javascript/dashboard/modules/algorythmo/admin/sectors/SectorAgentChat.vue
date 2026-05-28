<script setup>
// algorythmo: Cinematic OS v1 — sector agent panel.
// 360px sticky right rail floating on a soft glass surface, geometric monogram,
// machine-voice bubbles, cmd+enter submit. All visual decisions live in the
// design system (_components.scss :: `.alg-agent*`).
//
// Distinct from ReplyBox by design (do NOT reuse). The agent panel is the
// founder's command-room conversation surface, not the customer support reply.
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps({
  sectorNameKey: {
    type: String,
    required: true,
  },
});

const { t } = useI18n();

const draft = ref('');
const messages = ref([]);

function submit() {
  const trimmed = draft.value.trim();
  if (!trimmed) return;
  // Frontend-only Day-1: clear the draft. Real transport (POST + optimistic
  // append into `messages`) ships with M8c+ ingestion.
  draft.value = '';
}

const canSubmit = computed(() => draft.value.trim().length > 0);

function onKeydown(event) {
  const isCmdEnter = event.key === 'Enter' && (event.metaKey || event.ctrlKey);
  if (isCmdEnter) {
    event.preventDefault();
    submit();
  }
}
</script>

<template>
  <aside
    class="alg-agent"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.AGENT.ARIA_LABEL')"
  >
    <header class="alg-agent__header">
      <span class="alg-agent__avatar" aria-hidden="true">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          class="alg-agent__monogram"
        >
          <rect
            x="4"
            y="4"
            width="24"
            height="24"
            rx="1"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
          />
          <line
            x1="16"
            y1="4"
            x2="16"
            y2="28"
            stroke="currentColor"
            stroke-width="1"
          />
          <line
            x1="4"
            y1="16"
            x2="28"
            y2="16"
            stroke="currentColor"
            stroke-width="1"
          />
        </svg>
      </span>
      <div class="alg-agent__identity">
        <p class="alg-agent__name">
          {{ t(sectorNameKey) }}
          <span class="alg-agent__name-suffix">
            {{ t('ALGORYTHMO_ADMIN.SECTORS.AGENT.NAME_SUFFIX') }}
          </span>
        </p>
        <p class="alg-agent__status">
          <span class="alg-agent__status-dot" aria-hidden="true" />
          <span class="alg-agent__status-label">{{
            t('ALGORYTHMO_ADMIN.SECTORS.AGENT.STATUS_OFFLINE')
          }}</span>
        </p>
      </div>
    </header>

    <div class="alg-agent__messages">
      <ul v-if="messages.length" class="alg-agent__list">
        <li
          v-for="(msg, idx) in messages"
          :key="idx"
          class="alg-agent__bubble"
          :class="{
            'alg-agent__bubble--agent': msg.from === 'agent',
            'alg-agent__bubble--user': msg.from === 'user',
          }"
        >
          {{ msg.text }}
        </li>
      </ul>
      <p v-else class="alg-agent__empty">
        {{ t('ALGORYTHMO_ADMIN.SECTORS.AGENT.EMPTY') }}
      </p>
    </div>

    <form
      class="alg-agent__form"
      :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.AGENT.FORM_ARIA')"
      @submit.prevent="submit"
    >
      <textarea
        v-model="draft"
        class="alg-agent__input"
        rows="1"
        :placeholder="t('ALGORYTHMO_ADMIN.SECTORS.AGENT.PLACEHOLDER')"
        :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.AGENT.INPUT_ARIA')"
        aria-keyshortcuts="Meta+Enter Control+Enter"
        aria-describedby="alg-agent-hint"
        @keydown="onKeydown"
      />
      <button
        type="submit"
        class="alg-agent__send"
        :disabled="!canSubmit"
        :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.AGENT.SEND_ARIA')"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          aria-hidden="true"
          class="alg-agent__send-icon"
        >
          <path
            d="M1.5 7 L12.5 1.5 L7 12.5 L6 8 L1.5 7 Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <span id="alg-agent-hint" class="alg-agent__hint">
        {{ t('ALGORYTHMO_ADMIN.SECTORS.AGENT.HINT') }}
      </span>
    </form>
  </aside>
</template>
