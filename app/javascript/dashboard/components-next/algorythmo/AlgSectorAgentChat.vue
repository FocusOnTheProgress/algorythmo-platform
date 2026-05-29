<script setup>
// algorythmo: Cinematic OS pattern — Sector Agent Chat (DESIGN.md §5.12, G5)
//
// The bottom-of-page agent chat block reused by EVERY sector overview. It is
// a full-width block and the LAST element of the page (NOT a right rail —
// locked rule). Header reads "Fale com o agente do setor '{sector}'" with the
// agent's Planet Avatar; below is the conversation (parent-supplied via the
// default slot) and a message input.
//
// The block carries a stable scroll-anchor id (sectorAgentChatAnchorId) so the
// top-of-page trigger (AlgSectorAgentChatTrigger) can smooth-scroll to it.
//
// Frontend foundation only: this component owns presentation + the draft input
// and emits `send`; wiring messages/transport is the consuming screen's job.
import { computed, ref } from 'vue';
import AlgPlanetAvatar from './AlgPlanetAvatar.vue';
import AlgGlassCard from './AlgGlassCard.vue';
import { sectorAgentChatAnchorId } from './sectorAgentChat';

const props = defineProps({
  // Sector display name, e.g. "Comercial". Drives the header copy + anchor id.
  sector: {
    type: String,
    required: true,
  },
  // Agent name driving the Planet Avatar identity (deterministic per agent).
  agentName: {
    type: String,
    default: 'Manu',
  },
  placeholder: {
    type: String,
    default: 'Escreva uma mensagem…',
  },
  // Send button label. Defaults to pt-BR; pass $t(...) from a consuming screen.
  sendLabel: {
    type: String,
    default: 'Enviar',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['send']);

const draft = ref('');

const anchorId = computed(() => sectorAgentChatAnchorId(props.sector));
const heading = computed(() => `Fale com o agente do setor '${props.sector}'`);

function submit() {
  const text = draft.value.trim();
  if (!text || props.disabled) return;
  emit('send', text);
  draft.value = '';
}
</script>

<template>
  <section :id="anchorId" class="alg-sector-agent-chat" :aria-label="heading">
    <header class="alg-sector-agent-chat__header">
      <AlgPlanetAvatar :name="agentName" size="lg" />
      <div class="alg-sector-agent-chat__heading">
        <h2 class="alg-sector-agent-chat__title">{{ heading }}</h2>
        <p class="alg-sector-agent-chat__subtitle">{{ agentName }}</p>
      </div>
    </header>

    <AlgGlassCard tier="soft" class="alg-sector-agent-chat__surface">
      <div
        class="alg-sector-agent-chat__log"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        <slot />
      </div>

      <form class="alg-sector-agent-chat__composer" @submit.prevent="submit">
        <label :for="`${anchorId}-input`" class="alg-sector-agent-chat__sr">
          {{ heading }}
        </label>
        <input
          :id="`${anchorId}-input`"
          v-model="draft"
          class="alg-input alg-sector-agent-chat__input"
          type="text"
          :placeholder="placeholder"
          :disabled="disabled"
          autocomplete="off"
        />
        <button
          type="submit"
          class="alg-btn alg-btn--primary"
          :disabled="disabled || !draft.trim()"
        >
          {{ sendLabel }}
        </button>
      </form>
    </AlgGlassCard>
  </section>
</template>

<style lang="scss" scoped>
.alg-sector-agent-chat {
  // Full width, last element of the page. Top spacing gives it gravity as the
  // closing block rather than a floating panel.
  width: 100%;
  margin-top: var(--alg-space-12);
  scroll-margin-top: var(--alg-admin-topbar-height);
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-4);
}

.alg-sector-agent-chat__header {
  display: flex;
  align-items: center;
  gap: var(--alg-space-3);
}

.alg-sector-agent-chat__title {
  margin: 0;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-xl);
  font-weight: var(--alg-weight-regular);
  letter-spacing: var(--alg-tracking-tight);
  line-height: var(--alg-leading-snug);
  color: var(--alg-fg-primary);
}

.alg-sector-agent-chat__subtitle {
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-sector-agent-chat__surface {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-4);
}

.alg-sector-agent-chat__log {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-3);
  min-height: 4rem;
}

.alg-sector-agent-chat__composer {
  display: flex;
  align-items: center;
  gap: var(--alg-space-2);
}

.alg-sector-agent-chat__input {
  flex: 1 1 auto;
}

// Visually hidden label kept for screen readers (input has a visible
// placeholder but placeholders are not accessible names).
.alg-sector-agent-chat__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
