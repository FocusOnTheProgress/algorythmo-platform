<script setup>
// algorythmo: Cinematic OS v3 — sector agent conversation strip (plan 0009, F-B).
// Lives INSIDE the sector hero band (SectorShellV2). Identity (planet avatar +
// heading) is owned by the hero; this component is the agent's VOICE + the
// composer: one typed opening line (AlgTypewriter), the message thread, and the
// input with a send + a voice (mic) affordance.
//
// Distinct from ReplyBox by design (do NOT reuse). This is the founder's
// command-room conversation surface, not the customer support reply.
//
// Frontend-only Day-1: `messages` starts empty; the opening line is seeded from
// i18n and voiced by the typewriter. Real transport (POST + optimistic append)
// ships with M8c+ ingestion. The mic is VISUAL ONLY — no audio APIs.
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlgTypewriter } from 'dashboard/components-next/algorythmo';

const props = defineProps({
  sectorNameKey: {
    type: String,
    required: true,
  },
});

const { t } = useI18n();

const draft = ref('');
const messages = ref([]);

// The agent's seeded opening line. Frontend-only; voiced by AlgTypewriter.
const opening = computed(() =>
  t('ALGORYTHMO_ADMIN.SECTORS.AGENT.OPENING', { name: t(props.sectorNameKey) })
);

function submit() {
  const trimmed = draft.value.trim();
  if (!trimmed) return;
  // Frontend-only Day-1: clear the draft. Real transport (POST + optimistic
  // append into `messages`) ships with M8c+ ingestion.
  draft.value = '';
}

// Enter submits (Shift+Enter inserts a newline). Cmd/Ctrl+Enter also submits so
// muscle memory from other composers still works.
function onKeydown(event) {
  if (event.key !== 'Enter') return;
  if (event.shiftKey) return; // newline
  event.preventDefault();
  submit();
}
</script>

<template>
  <!-- algorythmo: A7 — the agent surface is CENTERED (not full-span) and its
       information is centre-aligned: the typed opening line and the composer
       live in a measured column. Clutter removed (the OFFLINE status row, the
       twin send/"+" affordance). The single bottom-corner affordance is an
       ENLARGED microphone — the command-room "speak to the agent" gesture. -->
  <div
    class="alg-agent alg-agent--centered"
    :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.AGENT.ARIA_LABEL')"
  >
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
      <p v-else class="alg-agent__opening">
        <AlgTypewriter :text="opening" :speed="22" :start-delay="320" />
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
        aria-keyshortcuts="Enter Meta+Enter Control+Enter"
        aria-describedby="alg-agent-hint"
        @keydown="onKeydown"
      />
      <!-- The single composer affordance: an ENLARGED microphone in the bottom
           corner. Submitting a typed draft sends it (Enter / the mic acts as the
           submit control); with no draft it is the voice gesture. VISUAL ONLY —
           no getUserMedia / MediaRecorder until the live transport. -->
      <button
        type="submit"
        class="alg-agent__mic"
        :aria-label="t('ALGORYTHMO_ADMIN.SECTORS.AGENT.MIC_ARIA')"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          aria-hidden="true"
          class="alg-agent__mic-icon"
        >
          <rect
            x="9"
            y="3"
            width="6"
            height="11"
            rx="3"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path
            d="M6 11a6 6 0 0 0 12 0"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <line
            x1="12"
            y1="17"
            x2="12"
            y2="21"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <span id="alg-agent-hint" class="alg-agent__hint">
        {{ t('ALGORYTHMO_ADMIN.SECTORS.AGENT.HINT') }}
      </span>
    </form>
  </div>
</template>
