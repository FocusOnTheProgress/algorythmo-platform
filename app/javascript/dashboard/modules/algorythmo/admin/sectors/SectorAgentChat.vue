<script setup>
// algorythmo: M6 PR-6b — sector agent chat panel. Distinct component from
// ReplyBox (do NOT reuse). 360px sticky right panel: geometric monogram avatar,
// bordered machine-voice bubbles, cmd+enter submit hint. Empty state for Day-1.
// Plan 0005 §M6.
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

<style scoped lang="scss">
.alg-agent {
  position: sticky;
  top: var(--alg-admin-topbar-height, 0);
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: calc(100vh - var(--alg-admin-topbar-height, 0px));
  border-left: 1px solid rgba(148, 163, 184, 0.08);
  background: transparent;
}

.alg-agent__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}

.alg-agent__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: rgba(148, 163, 184, 0.7);
}

.alg-agent__monogram {
  display: block;
}

.alg-agent__identity {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.alg-agent__name {
  font-family:
    'InterDisplay',
    'Inter',
    -apple-system,
    system-ui,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(226, 232, 240, 0.92);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alg-agent__name-suffix {
  color: rgba(148, 163, 184, 0.55);
  font-weight: 400;
}

.alg-agent__status {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  margin: 0;
  font-size: 11px;
  color: rgba(148, 163, 184, 0.55);
}

.alg-agent__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.4);
}

.alg-agent__status-label {
  text-transform: lowercase;
  letter-spacing: 0.02em;
}

.alg-agent__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
}

.alg-agent__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alg-agent__bubble {
  font-size: 0.8125rem;
  line-height: 1.5;
  padding: 0.625rem 0.875rem;
  border-radius: 4px;
  max-width: 85%;

  &--agent {
    border: 1px solid rgba(148, 163, 184, 0.22);
    background: transparent;
    color: rgba(226, 232, 240, 0.85);
    align-self: flex-start;
  }

  &--user {
    background: rgba(148, 163, 184, 0.08);
    color: rgba(226, 232, 240, 0.95);
    align-self: flex-end;
  }
}

.alg-agent__empty {
  margin: auto 0;
  font-size: 0.8125rem;
  line-height: 1.5;
  color: rgba(148, 163, 184, 0.55);
  text-align: center;
  max-width: 32ch;
  align-self: center;
}

.alg-agent__form {
  position: relative;
  padding: 0.875rem 1rem 1.125rem;
  border-top: 1px solid rgba(148, 163, 184, 0.08);
}

.alg-agent__input {
  width: 100%;
  resize: none;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 4px;
  padding: 0.625rem 4rem 0.625rem 0.75rem;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: rgba(226, 232, 240, 0.92);
  font-family: inherit;
  outline: none;
  transition: border-color 120ms ease;

  &:focus {
    border-color: rgba(148, 163, 184, 0.42);
  }

  &::placeholder {
    color: rgba(148, 163, 184, 0.58);
  }
}

.alg-agent__send {
  position: absolute;
  right: 1.5rem;
  bottom: 1.625rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 24px;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 4px;
  color: rgba(226, 232, 240, 0.85);
  cursor: pointer;
  transition:
    border-color 120ms ease,
    color 120ms ease,
    background-color 120ms ease;

  &:hover:not(:disabled) {
    border-color: rgba(148, 163, 184, 0.45);
    background: rgba(148, 163, 184, 0.06);
  }

  &:focus-visible {
    outline: 2px solid var(--color-woot, #6c4de5);
    outline-offset: 2px;
  }

  &:disabled {
    color: rgba(148, 163, 184, 0.32);
    border-color: rgba(148, 163, 184, 0.1);
    cursor: not-allowed;
  }
}

.alg-agent__send-icon {
  display: block;
  transform: translateX(-1px);
}

.alg-agent__hint {
  margin-top: 0.5rem;
  display: block;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 10px;
  color: rgba(148, 163, 184, 0.62);
  letter-spacing: 0.02em;
  pointer-events: none;
}
</style>
