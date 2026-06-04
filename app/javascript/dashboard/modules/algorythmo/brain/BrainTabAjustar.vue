<script setup>
// algorythmo: Brain — "Ajustar" tab (plan 0012 §2 / PR4).
//
// Two doors to feed the Brain, both wired to the real motor:
//   (a) document upload → POST /brain/documents (multipart) — BrainDocumentUpload
//   (b) paste knowledge → POST /brain/adjustments ({ content, title? })
//
// This is "the door ready to attach documents later": fully functional now, no
// fixture. The operator (well, the admin) drops a file or pastes text; the Brain
// ingests asynchronously. Both emit `ingested` so the parent can refresh "Ver".
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import BrainDocumentUpload from './BrainDocumentUpload.vue';

const props = defineProps({
  accountId: { type: [Number, String], default: null },
});

const emit = defineEmits(['ingested']);

const { t } = useI18n();

const title = ref('');
const content = ref('');
// 'idle' | 'saving' | 'saved' | 'error'
const pasteState = ref('idle');
const pasteError = ref('');

const canSubmitPaste = computed(
  () => content.value.trim().length > 0 && pasteState.value !== 'saving'
);

async function submitPaste() {
  if (!canSubmitPaste.value) return;
  pasteState.value = 'saving';
  pasteError.value = '';

  const { brainService } = await import('./brain.service');
  try {
    const doc = await brainService.postAdjustment(props.accountId, {
      content: content.value,
      title: title.value.trim() || undefined,
    });
    pasteState.value = 'saved';
    title.value = '';
    content.value = '';
    emit('ingested', doc);
    // Settle the confirmation back to idle so a second paste is unambiguous.
    window.setTimeout(() => {
      if (pasteState.value === 'saved') pasteState.value = 'idle';
    }, 3000);
  } catch (err) {
    pasteState.value = 'error';
    pasteError.value =
      err?.response?.data?.error || t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.ERROR');
  }
}

function onUploaded(doc) {
  emit('ingested', doc);
}
</script>

<template>
  <section
    class="alg-brain-ajustar"
    :aria-label="t('ALGORYTHMO_BRAIN.AJUSTAR.ARIA_LABEL')"
  >
    <!-- Upload -->
    <div class="alg-brain-ajustar__block">
      <h2 class="alg-brain-ajustar__heading">
        {{ t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.HEADING') }}
      </h2>
      <p class="alg-brain-ajustar__lede">
        {{ t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.LEDE') }}
      </p>
      <BrainDocumentUpload :account-id="accountId" @uploaded="onUploaded" />
    </div>

    <hr class="alg-brain-ajustar__divider" aria-hidden="true" />

    <!-- Paste knowledge -->
    <div class="alg-brain-ajustar__block">
      <h2 class="alg-brain-ajustar__heading">
        {{ t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.HEADING') }}
      </h2>
      <p class="alg-brain-ajustar__lede">
        {{ t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.LEDE') }}
      </p>

      <form class="alg-brain-ajustar__form" @submit.prevent="submitPaste">
        <label class="alg-brain-ajustar__field">
          <span class="alg-brain-ajustar__label">
            {{ t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.TITLE_LABEL') }}
          </span>
          <input
            v-model="title"
            type="text"
            class="alg-brain-ajustar__input"
            :placeholder="t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.TITLE_PLACEHOLDER')"
            maxlength="200"
          />
        </label>

        <label class="alg-brain-ajustar__field">
          <span class="alg-brain-ajustar__label">
            {{ t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.CONTENT_LABEL') }}
          </span>
          <textarea
            v-model="content"
            class="alg-brain-ajustar__textarea"
            rows="8"
            :placeholder="
              t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.CONTENT_PLACEHOLDER')
            "
          />
        </label>

        <div class="alg-brain-ajustar__actions">
          <p
            v-if="pasteState === 'saved'"
            class="alg-brain-ajustar__feedback alg-brain-ajustar__feedback--ok"
            role="status"
          >
            <span class="i-lucide-check" aria-hidden="true" />
            {{ t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.SAVED') }}
          </p>
          <p
            v-else-if="pasteState === 'error'"
            class="alg-brain-ajustar__feedback alg-brain-ajustar__feedback--err"
            role="alert"
          >
            <span class="i-lucide-triangle-alert" aria-hidden="true" />
            {{ pasteError }}
          </p>
          <span v-else class="alg-brain-ajustar__spacer" />

          <button
            type="submit"
            class="alg-brain-ajustar__submit"
            :disabled="!canSubmitPaste"
          >
            <span
              v-if="pasteState === 'saving'"
              class="i-lucide-loader alg-brain-ajustar__submit-glyph"
              aria-hidden="true"
            />
            {{
              pasteState === 'saving'
                ? t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.SAVING')
                : t('ALGORYTHMO_BRAIN.AJUSTAR.PASTE.SUBMIT')
            }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped lang="scss">
.alg-brain-ajustar {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-6);
}

.alg-brain-ajustar__block {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-3);
}

.alg-brain-ajustar__heading {
  margin: 0;
  font-family: var(--alg-font-display);
  font-size: var(--alg-text-md);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
}

.alg-brain-ajustar__lede {
  margin: 0;
  max-width: 64ch;
  font-size: var(--alg-text-xs);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-tertiary);
}

.alg-brain-ajustar__divider {
  margin: 0;
  border: none;
  border-top: 1px solid var(--alg-border);
}

.alg-brain-ajustar__form {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-4);
}

.alg-brain-ajustar__field {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-2);
}

.alg-brain-ajustar__label {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
}

.alg-brain-ajustar__input,
.alg-brain-ajustar__textarea {
  width: 100%;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-sm);
  color: var(--alg-fg-primary);
  background: color-mix(in oklch, var(--alg-bg) 60%, transparent);
  border: 1px solid var(--alg-glass-border);
  border-radius: var(--alg-radius-md);
  padding: var(--alg-space-3);
  resize: vertical;
  transition: border-color var(--alg-duration-fast) var(--alg-ease-cinematic);

  &::placeholder {
    color: var(--alg-fg-quaternary);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--alg-color-brand-primary);
    box-shadow: 0 0 0 3px
      color-mix(in oklch, var(--alg-color-brand-primary), transparent 80%);
  }
}

.alg-brain-ajustar__textarea {
  line-height: var(--alg-leading-normal);
  min-height: 9rem;
}

.alg-brain-ajustar__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--alg-space-4);
}

.alg-brain-ajustar__spacer {
  flex: 1;
}

.alg-brain-ajustar__feedback {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  flex: 1;
  font-size: var(--alg-text-xs);

  span {
    width: 0.9rem;
    height: 0.9rem;
    flex: none;
  }

  &--ok {
    color: var(--alg-color-success);
  }
  &--err {
    color: var(--alg-color-danger);
  }
}

.alg-brain-ajustar__submit {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: none;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-snug);
  text-transform: uppercase;
  padding: var(--alg-space-3) var(--alg-space-5);
  min-height: 40px;
  border-radius: var(--alg-radius-md);
  border: 1px solid transparent;
  background: var(--alg-bg-inverse);
  color: var(--alg-fg-inverse);
  cursor: pointer;
  transition:
    opacity var(--alg-duration-fast) var(--alg-ease-cinematic),
    transform var(--alg-duration-instant) var(--alg-ease-cinematic);

  &:not(:disabled):active {
    transform: translateY(0.5px) scale(0.99);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--alg-color-brand-primary);
    outline-offset: 2px;
  }
}

.alg-brain-ajustar__submit-glyph {
  width: 0.9rem;
  height: 0.9rem;
  animation: alg-ajustar-spin 1s linear infinite;
}

@keyframes alg-ajustar-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-brain-ajustar__submit-glyph {
    animation: none;
  }
}
</style>
