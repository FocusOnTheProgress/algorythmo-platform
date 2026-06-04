<script setup>
// algorythmo: PR7 — Copiloto (operator knowledge consultant) chat surface.
//
// The OPERATOR's tab (Malu). A grounded Q&A chat over the company Brain.
// Day-1 is read-only: ask a question, get an answer that is 100% grounded in
// the Brain — or an HONEST non-answer. It NEVER invents, NEVER writes, NEVER
// touches a conversation or the CRM.
//
// Four answer states, each visually distinct (DESIGN.md §14.8 — states are
// designed, not afterthoughts):
//   · grounded            — answer + citation chips (page_slug)
//   · ungrounded          — "não encontrei isso no Cérebro" (not a failure)
//   · degraded            — "resposta indisponível, tente de novo"
//   · engine_unconfigured — "motor de IA não configurado" (a SYSTEM state,
//                           styled distinctly from "não sei" — never conflate
//                           "I don't know" with "the engine is off").
// Plus transport errors: 429 (saturated), 422 (invalid/too long, inline),
// 401/403 (forbidden), 5xx (generic retry).
//
// ANTI-XSS (critical): the `answer` is raw LLM text. A malicious document in
// the Brain must not be able to inject <script> through the answer. We render
// it EXCLUSIVELY through text interpolation ({{ }}) — never v-html. Vue escapes
// interpolated text, so any markup in the answer is shown as literal characters.
import { ref, computed, nextTick, useTemplateRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMapGetter } from 'dashboard/composables/store';
import AlgGlassCard from 'dashboard/components-next/algorythmo/AlgGlassCard.vue';
import {
  copilotService,
  COPILOT_STATES,
  COPILOT_ERRORS,
  COPILOT_MAX_QUESTION_LENGTH,
} from './copilot.service';

const { t, tm, rt } = useI18n();
const accountId = useMapGetter('getCurrentAccountId');

// In-session conversation. Each turn is { id, role, … }. Cleared on reload —
// Day-1 keeps no server-side history.
//   role: 'user'    → { text }
//   role: 'copilot' → { state, answer, citations, paragraphs }
//   role: 'error'   → { kind, message }
const turns = ref([]);
const draft = ref('');
const isAsking = ref(false);
let turnSeq = 0;

const logRef = useTemplateRef('logRef');

const trimmed = computed(() => draft.value.trim());
const charCount = computed(() => draft.value.length);
const tooLong = computed(() => charCount.value > COPILOT_MAX_QUESTION_LENGTH);
const canSend = computed(
  () => !isAsking.value && trimmed.value.length > 0 && !tooLong.value
);

const isEmpty = computed(() => turns.value.length === 0 && !isAsking.value);

// "123 / 2000" — built in script so the template carries no raw text.
const counterText = computed(
  () => `${charCount.value} / ${COPILOT_MAX_QUESTION_LENGTH}`
);

// Split raw answer text into paragraphs for comfortable reading. Every segment
// is rendered via {{ }} (escaped) — splitting changes layout only, never the
// escaping contract.
function toParagraphs(text) {
  return String(text)
    .split(/\n{2,}/)
    .map(block => block.replace(/\n/g, ' ').trim())
    .filter(Boolean);
}

async function scrollToEnd() {
  await nextTick();
  const el = logRef.value;
  if (el) el.scrollTop = el.scrollHeight;
}

function nextTurnId() {
  turnSeq += 1;
  return turnSeq;
}

// Always our own honest copy — we do not surface a raw backend string to the
// operator (it may leak internals; ours is calibrated per state).
function errorCopy(kind) {
  switch (kind) {
    case COPILOT_ERRORS.RATE_LIMITED:
      return t('ALGORYTHMO_COPILOT.ERRORS.RATE_LIMITED');
    case COPILOT_ERRORS.FORBIDDEN:
      return t('ALGORYTHMO_COPILOT.ERRORS.FORBIDDEN');
    default:
      return t('ALGORYTHMO_COPILOT.ERRORS.UNKNOWN');
  }
}

async function ask() {
  if (!canSend.value) return;
  const question = trimmed.value;

  turns.value.push({ id: nextTurnId(), role: 'user', text: question });
  draft.value = '';
  isAsking.value = true;
  await scrollToEnd();

  try {
    const result = await copilotService.ask(accountId.value, question);
    turns.value.push({
      id: nextTurnId(),
      role: 'copilot',
      state: result.state,
      answer: result.answer,
      paragraphs: toParagraphs(result.answer),
      citations: result.citations,
    });
  } catch (err) {
    turns.value.push({
      id: nextTurnId(),
      role: 'error',
      kind: err.kind || COPILOT_ERRORS.UNKNOWN,
      message: errorCopy(err.kind),
    });
  } finally {
    isAsking.value = false;
    await scrollToEnd();
  }
}

function stateLabel(state) {
  switch (state) {
    case COPILOT_STATES.UNGROUNDED:
      return t('ALGORYTHMO_COPILOT.STATES.UNGROUNDED');
    case COPILOT_STATES.DEGRADED:
      return t('ALGORYTHMO_COPILOT.STATES.DEGRADED');
    case COPILOT_STATES.ENGINE_UNCONFIGURED:
      return t('ALGORYTHMO_COPILOT.STATES.ENGINE_UNCONFIGURED');
    default:
      return '';
  }
}

// A stable, human-ish chip label from a page_slug. The slug is the Day-1
// identifier; we de-slugify it for display without claiming a real title.
function citationLabel(citation) {
  const slug = citation?.page_slug;
  if (!slug) return t('ALGORYTHMO_COPILOT.CITATION.UNKNOWN');
  return String(slug).replace(/[-_]+/g, ' ').trim();
}

// vue-i18n returns arrays via tm(); each element is resolved with rt(). t()
// would coerce the array to a string, so suggestions would silently vanish.
const suggestions = computed(() => {
  const list = tm('ALGORYTHMO_COPILOT.EMPTY.SUGGESTIONS');
  return Array.isArray(list) ? list.map(item => rt(item)) : [];
});

function useSuggestion(text) {
  draft.value = text;
}
</script>

<template>
  <section
    class="alg-copilot alg-density-editorial"
    :aria-label="t('ALGORYTHMO_COPILOT.ARIA_LABEL')"
  >
    <!-- Editorial header — quiet, no hero chrome. -->
    <header class="alg-copilot__header">
      <p class="alg-copilot__eyebrow">
        {{ t('ALGORYTHMO_COPILOT.EYEBROW') }}
      </p>
      <h1 class="alg-copilot__title">{{ t('ALGORYTHMO_COPILOT.TITLE') }}</h1>
      <p class="alg-copilot__subtitle">
        {{ t('ALGORYTHMO_COPILOT.SUBTITLE') }}
      </p>
    </header>

    <AlgGlassCard tier="soft" class="alg-copilot__surface">
      <div
        ref="logRef"
        class="alg-copilot__log"
        role="log"
        aria-live="polite"
        aria-atomic="false"
      >
        <!-- Empty state — designed, with starter prompts. -->
        <div v-if="isEmpty" class="alg-copilot__empty">
          <span
            class="i-lucide-sparkles alg-copilot__empty-glyph"
            aria-hidden="true"
          />
          <p class="alg-copilot__empty-title">
            {{ t('ALGORYTHMO_COPILOT.EMPTY.TITLE') }}
          </p>
          <p class="alg-copilot__empty-body">
            {{ t('ALGORYTHMO_COPILOT.EMPTY.BODY') }}
          </p>
          <ul v-if="suggestions.length" class="alg-copilot__suggestions">
            <li v-for="(s, i) in suggestions" :key="i">
              <button
                type="button"
                class="alg-copilot__suggestion"
                @click="useSuggestion(s)"
              >
                {{ s }}
              </button>
            </li>
          </ul>
        </div>

        <!-- Conversation turns. -->
        <template v-for="turn in turns" :key="turn.id">
          <!-- User question. -->
          <div
            v-if="turn.role === 'user'"
            class="alg-copilot__turn alg-copilot__turn--user"
          >
            <p class="alg-copilot__bubble alg-copilot__bubble--user">
              {{ turn.text }}
            </p>
          </div>

          <!-- Copilot answer — one of the four honest states. -->
          <div
            v-else-if="turn.role === 'copilot'"
            class="alg-copilot__turn alg-copilot__turn--copilot"
          >
            <!-- grounded: answer + citation chips. -->
            <div
              v-if="turn.state === COPILOT_STATES.GROUNDED"
              class="alg-copilot__answer"
              data-state="grounded"
            >
              <!--
                ANTI-XSS: each paragraph is interpolated text ({{ }}), so any
                markup in the LLM answer is escaped to literal characters.
                NEVER swap this for v-html.
              -->
              <p
                v-for="(para, i) in turn.paragraphs"
                :key="i"
                class="alg-copilot__answer-text"
              >
                {{ para }}
              </p>

              <ul
                v-if="turn.citations.length"
                class="alg-copilot__citations"
                :aria-label="t('ALGORYTHMO_COPILOT.CITATION.ARIA_LABEL')"
              >
                <li v-for="(cite, i) in turn.citations" :key="i">
                  <span class="alg-copilot__citation" :title="cite.page_slug">
                    <span
                      class="i-lucide-file-text alg-copilot__citation-glyph"
                      aria-hidden="true"
                    />
                    <span class="alg-copilot__citation-label">
                      {{ citationLabel(cite) }}
                    </span>
                  </span>
                </li>
              </ul>
            </div>

            <!-- ungrounded: honest "not in the Brain" — NOT a system error. -->
            <div
              v-else-if="turn.state === COPILOT_STATES.UNGROUNDED"
              class="alg-copilot__notice alg-copilot__notice--ungrounded"
              data-state="ungrounded"
            >
              <span
                class="i-lucide-search-x alg-copilot__notice-glyph"
                aria-hidden="true"
              />
              <p class="alg-copilot__notice-text">
                {{ stateLabel(turn.state) }}
              </p>
            </div>

            <!-- degraded: transient — try again. -->
            <div
              v-else-if="turn.state === COPILOT_STATES.DEGRADED"
              class="alg-copilot__notice alg-copilot__notice--degraded"
              data-state="degraded"
            >
              <span
                class="i-lucide-rotate-ccw alg-copilot__notice-glyph"
                aria-hidden="true"
              />
              <p class="alg-copilot__notice-text">
                {{ stateLabel(turn.state) }}
              </p>
            </div>

            <!-- engine_unconfigured: SYSTEM state, distinct from "não sei". -->
            <div
              v-else
              class="alg-copilot__notice alg-copilot__notice--engine"
              data-state="engine_unconfigured"
              role="status"
            >
              <span
                class="i-lucide-plug-zap alg-copilot__notice-glyph"
                aria-hidden="true"
              />
              <div class="alg-copilot__notice-stack">
                <p class="alg-copilot__notice-text">
                  {{ stateLabel(COPILOT_STATES.ENGINE_UNCONFIGURED) }}
                </p>
                <p class="alg-copilot__notice-hint">
                  {{ t('ALGORYTHMO_COPILOT.STATES.ENGINE_UNCONFIGURED_HINT') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Transport error (429 / 401 / 403 / 5xx). -->
          <div v-else class="alg-copilot__turn alg-copilot__turn--copilot">
            <div
              class="alg-copilot__notice alg-copilot__notice--error"
              :data-error="turn.kind"
              role="alert"
            >
              <span
                class="i-lucide-triangle-alert alg-copilot__notice-glyph"
                aria-hidden="true"
              />
              <p class="alg-copilot__notice-text">{{ turn.message }}</p>
            </div>
          </div>
        </template>

        <!-- Thinking indicator (skeleton-style, no spinner). -->
        <div
          v-if="isAsking"
          class="alg-copilot__turn alg-copilot__turn--copilot"
          aria-live="polite"
        >
          <div class="alg-copilot__thinking" data-testid="copilot-loading">
            <span class="alg-copilot__thinking-dot" />
            <span class="alg-copilot__thinking-dot" />
            <span class="alg-copilot__thinking-dot" />
            <span class="alg-copilot__sr">
              {{ t('ALGORYTHMO_COPILOT.LOADING') }}
            </span>
          </div>
        </div>
      </div>

      <!-- Composer. -->
      <form class="alg-copilot__composer" @submit.prevent="ask">
        <label for="alg-copilot-input" class="alg-copilot__sr">
          {{ t('ALGORYTHMO_COPILOT.INPUT_LABEL') }}
        </label>
        <div class="alg-copilot__field">
          <textarea
            id="alg-copilot-input"
            v-model="draft"
            class="alg-input alg-copilot__input"
            :class="{ 'alg-copilot__input--invalid': tooLong }"
            :placeholder="t('ALGORYTHMO_COPILOT.PLACEHOLDER')"
            :aria-invalid="tooLong || undefined"
            aria-describedby="alg-copilot-counter"
            rows="1"
            :disabled="isAsking"
            @keydown.enter.exact.prevent="ask"
          />
          <button
            type="submit"
            class="alg-btn alg-btn--primary alg-copilot__send"
            :disabled="!canSend"
            :aria-label="t('ALGORYTHMO_COPILOT.SEND')"
          >
            <span class="i-lucide-arrow-up" aria-hidden="true" />
          </button>
        </div>
        <p
          id="alg-copilot-counter"
          class="alg-copilot__counter"
          :class="{ 'alg-copilot__counter--invalid': tooLong }"
          :aria-live="tooLong ? 'polite' : 'off'"
        >
          <span v-if="tooLong" class="alg-copilot__counter-error">
            {{
              t('ALGORYTHMO_COPILOT.ERRORS.TOO_LONG', {
                max: COPILOT_MAX_QUESTION_LENGTH,
              })
            }}
          </span>
          <span v-else>{{ counterText }}</span>
        </p>
      </form>
    </AlgGlassCard>
  </section>
</template>

<style lang="scss" scoped>
.alg-copilot {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-6);
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: var(--alg-space-8);
}

// ── Header ──────────────────────────────────────────────────────────────────
.alg-copilot__header {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
}

.alg-copilot__eyebrow {
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-copilot__title {
  margin: 0;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-3xl);
  font-weight: var(--alg-weight-light);
  letter-spacing: var(--alg-tracking-tight);
  line-height: var(--alg-leading-tight);
  color: var(--alg-fg-primary);
}

.alg-copilot__subtitle {
  margin: 0;
  max-width: 56ch;
  font-size: var(--alg-text-sm);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-secondary);
}

// ── Surface ─────────────────────────────────────────────────────────────────
.alg-copilot__surface {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--alg-space-4);
  min-height: 0;
}

.alg-copilot__log {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--alg-space-4);
  min-height: 12rem;
  overflow-y: auto;
  scroll-behavior: smooth;
}

// ── Empty state ─────────────────────────────────────────────────────────────
.alg-copilot__empty {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--alg-space-3);
  padding: var(--alg-space-10) var(--alg-space-4);
  text-align: center;
}

.alg-copilot__empty-glyph {
  width: 2rem;
  height: 2rem;
  color: var(--alg-fg-tertiary);
}

.alg-copilot__empty-title {
  margin: 0;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-lg);
  font-weight: var(--alg-weight-regular);
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-primary);
}

.alg-copilot__empty-body {
  margin: 0;
  max-width: 44ch;
  font-size: var(--alg-text-sm);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-secondary);
}

.alg-copilot__suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--alg-space-2);
  margin: var(--alg-space-2) 0 0;
  padding: 0;
  list-style: none;
}

.alg-copilot__suggestion {
  padding: var(--alg-space-2) var(--alg-space-3);
  font-size: var(--alg-text-xs);
  color: var(--alg-fg-secondary);
  background: var(--alg-bg-tint-low);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-pill);
  cursor: pointer;
  transition: all var(--alg-duration-fast) var(--alg-ease-cinematic);

  &:hover {
    color: var(--alg-fg-primary);
    background: var(--alg-bg-tint-med);
  }
}

// ── Turns / bubbles ─────────────────────────────────────────────────────────
.alg-copilot__turn {
  display: flex;
  flex-direction: column;
}

.alg-copilot__turn--user {
  align-items: flex-end;
}

.alg-copilot__bubble {
  margin: 0;
  max-width: 80%;
  padding: var(--alg-space-3) var(--alg-space-4);
  font-size: var(--alg-text-sm);
  line-height: var(--alg-leading-normal);
  border-radius: var(--alg-radius-lg);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.alg-copilot__bubble--user {
  color: var(--alg-fg-primary);
  background: var(--alg-bg-tint-med);
  border: 1px solid var(--alg-border);
  border-bottom-right-radius: var(--alg-radius-sm);
}

// ── Answer (grounded) ───────────────────────────────────────────────────────
.alg-copilot__answer {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-3);
  max-width: 80%;
}

.alg-copilot__answer-text {
  margin: 0;
  font-size: var(--alg-text-sm);
  line-height: var(--alg-leading-relaxed);
  color: var(--alg-fg-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.alg-copilot__citations {
  display: flex;
  flex-wrap: wrap;
  gap: var(--alg-space-2);
  margin: var(--alg-space-1) 0 0;
  padding: 0;
  list-style: none;
}

.alg-copilot__citation {
  display: inline-flex;
  align-items: center;
  gap: var(--alg-space-1);
  max-width: 18rem;
  padding: var(--alg-space-1) var(--alg-space-2);
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  color: var(--alg-fg-secondary);
  background: var(--alg-bg-tint-low);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-sm);
}

.alg-copilot__citation-glyph {
  flex: none;
  width: 0.875rem;
  height: 0.875rem;
  color: var(--alg-fg-tertiary);
}

.alg-copilot__citation-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// ── Notices (ungrounded / degraded / engine / error) ────────────────────────
.alg-copilot__notice {
  display: flex;
  align-items: flex-start;
  gap: var(--alg-space-2);
  max-width: 80%;
  padding: var(--alg-space-3) var(--alg-space-4);
  font-size: var(--alg-text-sm);
  line-height: var(--alg-leading-normal);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-lg);
  background: var(--alg-bg-tint-low);
}

.alg-copilot__notice-glyph {
  flex: none;
  width: 1.125rem;
  height: 1.125rem;
  margin-top: 0.0625rem;
}

.alg-copilot__notice-text {
  margin: 0;
  color: var(--alg-fg-secondary);
}

.alg-copilot__notice-stack {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-1);
}

.alg-copilot__notice-hint {
  margin: 0;
  font-size: var(--alg-text-xs);
  color: var(--alg-fg-tertiary);
}

// ungrounded — neutral, calm (it is not a failure).
.alg-copilot__notice--ungrounded .alg-copilot__notice-glyph {
  color: var(--alg-fg-tertiary);
}

// degraded — transient, advisory amber.
.alg-copilot__notice--degraded {
  border-color: var(--alg-color-warning-border, var(--alg-border));
}
.alg-copilot__notice--degraded .alg-copilot__notice-glyph {
  color: var(--alg-color-warning, var(--alg-fg-secondary));
}

// engine_unconfigured — SYSTEM state, distinct treatment (info-blue), so the
// operator never reads it as "the Brain is empty".
.alg-copilot__notice--engine {
  border-color: var(--alg-color-info-border, var(--alg-border));
  background: var(--alg-color-info-bg, var(--alg-bg-tint-low));
}
.alg-copilot__notice--engine .alg-copilot__notice-glyph {
  color: var(--alg-color-info, var(--alg-fg-secondary));
}
.alg-copilot__notice--engine .alg-copilot__notice-text {
  color: var(--alg-fg-primary);
}

// transport error — danger.
.alg-copilot__notice--error {
  border-color: var(--alg-color-danger-border, var(--alg-border));
}
.alg-copilot__notice--error .alg-copilot__notice-glyph {
  color: var(--alg-color-danger, var(--alg-fg-secondary));
}

// ── Thinking indicator ──────────────────────────────────────────────────────
.alg-copilot__thinking {
  display: inline-flex;
  align-items: center;
  gap: var(--alg-space-2);
  padding: var(--alg-space-3) var(--alg-space-4);
}

.alg-copilot__thinking-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-fg-tertiary);
  animation: alg-copilot-pulse 1.2s var(--alg-ease-ambient, ease-in-out)
    infinite;

  &:nth-child(2) {
    animation-delay: 0.18s;
  }
  &:nth-child(3) {
    animation-delay: 0.36s;
  }
}

@keyframes alg-copilot-pulse {
  0%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-copilot__thinking-dot {
    animation-duration: 2s;
    animation-name: alg-copilot-fade;
  }
  @keyframes alg-copilot-fade {
    0%,
    100% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
  }
}

// ── Composer ────────────────────────────────────────────────────────────────
.alg-copilot__composer {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-1);
}

.alg-copilot__field {
  display: flex;
  align-items: flex-end;
  gap: var(--alg-space-2);
}

.alg-copilot__input {
  flex: 1 1 auto;
  min-height: 2.75rem;
  max-height: 9rem;
  padding: var(--alg-space-3) var(--alg-space-4);
  resize: none;
  line-height: var(--alg-leading-normal);
}

.alg-copilot__input--invalid {
  border-color: var(--alg-color-danger, var(--alg-border));
}

.alg-copilot__send {
  flex: none;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;

  span {
    width: 1.125rem;
    height: 1.125rem;
  }
}

.alg-copilot__counter {
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-snug);
  color: var(--alg-fg-quaternary);
  text-align: right;
}

.alg-copilot__counter--invalid {
  color: var(--alg-color-danger, var(--alg-fg-tertiary));
}

.alg-copilot__counter-error {
  color: var(--alg-color-danger, var(--alg-fg-secondary));
}

// ── Screen-reader-only ──────────────────────────────────────────────────────
.alg-copilot__sr {
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

@media (max-width: 768px) {
  .alg-copilot {
    padding: var(--alg-space-4);
  }
  .alg-copilot__bubble,
  .alg-copilot__answer,
  .alg-copilot__notice {
    max-width: 100%;
  }
}
</style>
