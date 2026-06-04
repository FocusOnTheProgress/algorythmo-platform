<script setup>
// algorythmo: Brain — document upload (plan 0012 §2.3 / PR4).
//
// Cherry-picked from the m8b worktree dropzone (Linear-style category chips +
// dropzone + file list + a11y), then RE-SKINNED onto the Cinematic OS token
// system (the original shipped hardcoded rgba; this consumes --alg-* only) and
// WIRED to the real multipart POST /brain/documents. Each picked file becomes a
// row with a live state — pending (uploading) → captured (queued ✓) → failed (✗)
// — reflecting the server's accept/reject/queue. The Brain ingests asynchronously;
// "captured" here means the upload was accepted and the ingestion worker enqueued
// (status pending server-side), surfaced honestly to the operator.
//
// Client-side allowlist + size are a courtesy pre-check ONLY — the server is the
// real gate (allowlist + magic-bytes + size, §4.3). A file that passes the
// pre-check can still be rejected (422) and shows as failed with the reason.
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlgAuroraBorder } from 'dashboard/components-next/algorythmo';

const props = defineProps({
  accountId: { type: [Number, String], default: null },
});

const emit = defineEmits(['uploaded']);

const { t } = useI18n();

// Real document categories (Document::CATEGORIES) + an "all" UI filter. "ajuste"
// is reserved for pasted text, not surfaced here.
const CATEGORIES = [
  { id: 'all', key: 'ALL', value: null },
  { id: 'policies', key: 'POLICIES', value: 'policies' },
  { id: 'manuals', key: 'MANUALS', value: 'manuals' },
  { id: 'rules', key: 'RULES', value: 'rules' },
  { id: 'design_system', key: 'DESIGN_SYSTEM', value: 'design_system' },
  { id: 'other', key: 'OTHER', value: 'other' },
];

const ALLOWED_EXT = ['pdf', 'docx', 'md', 'txt'];
const MAX_BYTES = 10 * 1024 * 1024;

const activeCategory = ref('policies');
const isDragging = ref(false);
const fileInput = ref(null);
// Each entry: { id, name, ext, size, category, state, error }
// state ∈ 'uploading' | 'captured' | 'rejected'
const items = ref([]);

const selectableCategories = computed(() =>
  CATEGORIES.filter(c => c.id !== 'all')
);

function extOf(name) {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

function categoryValue() {
  const found = CATEGORIES.find(c => c.id === activeCategory.value);
  return found?.value || 'other';
}

// Courtesy client-side validation; the server remains the authority.
function preCheck(file) {
  const ext = extOf(file.name);
  if (!ALLOWED_EXT.includes(ext)) {
    return {
      ok: false,
      reason: t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.REJECT_TYPE'),
    };
  }
  if (file.size > MAX_BYTES) {
    return {
      ok: false,
      reason: t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.REJECT_SIZE'),
    };
  }
  return { ok: true };
}

function updateItem(id, patch) {
  items.value = items.value.map(it =>
    it.id === id ? { ...it, ...patch } : it
  );
}

async function uploadOne(file, category) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const entry = {
    id,
    name: file.name,
    ext: extOf(file.name) || 'file',
    size: file.size,
    category,
    state: 'uploading',
    error: '',
  };

  const pre = preCheck(file);
  if (!pre.ok) {
    entry.state = 'rejected';
    entry.error = pre.reason;
    items.value = [entry, ...items.value];
    return;
  }

  items.value = [entry, ...items.value];

  // Lazy import to keep the dropzone testable without the axios global.
  const { brainService } = await import('./brain.service');
  try {
    const doc = await brainService.postDocument(props.accountId, {
      file,
      category,
    });
    updateItem(id, { state: 'captured', error: '' });
    emit('uploaded', doc);
  } catch (err) {
    const reason =
      err?.response?.data?.error || t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.FAILED');
    updateItem(id, { state: 'rejected', error: reason });
  }
}

function addFiles(list) {
  const category = categoryValue();
  list.forEach(file => uploadOne(file, category));
}

function onDrop(event) {
  isDragging.value = false;
  if (!event.dataTransfer?.files?.length) return;
  addFiles(Array.from(event.dataTransfer.files));
}
function onDragOver() {
  isDragging.value = true;
}
function onDragLeave() {
  isDragging.value = false;
}
function onBrowse() {
  fileInput.value?.click();
}
function onPick(event) {
  if (!event.target.files?.length) return;
  addFiles(Array.from(event.target.files));
  event.target.value = '';
}
function removeItem(id) {
  items.value = items.value.filter(it => it.id !== id);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATE_LABELS = {
  uploading: 'UPLOADING',
  captured: 'CAPTURED',
  rejected: 'REJECTED',
};
function stateLabel(state) {
  return t(`ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.STATE.${STATE_LABELS[state]}`);
}
</script>

<template>
  <section
    class="alg-doc-upload"
    :aria-label="t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.ARIA_LABEL')"
  >
    <header class="alg-doc-upload__filters">
      <button
        v-for="cat in selectableCategories"
        :key="cat.id"
        type="button"
        class="alg-doc-upload__filter"
        :class="{ 'alg-doc-upload__filter--active': activeCategory === cat.id }"
        :aria-pressed="activeCategory === cat.id"
        @click="activeCategory = cat.id"
      >
        {{ t(`ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.CATEGORIES.${cat.key}`) }}
      </button>
    </header>

    <!-- The dropzone is where the intelligence INGESTS — a sanctioned home for
         the Aurora Border (DESIGN.md §6.6). -->
    <AlgAuroraBorder as="div" intensity="subtle" class="alg-doc-upload__frame">
      <div
        class="alg-doc-upload__dropzone"
        :class="{ 'alg-doc-upload__dropzone--dragging': isDragging }"
        role="button"
        tabindex="0"
        :aria-label="t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.DROPZONE_ARIA')"
        @click="onBrowse"
        @keydown.enter.prevent="onBrowse"
        @keydown.space.prevent="onBrowse"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <span
          class="i-lucide-upload-cloud alg-doc-upload__glyph"
          aria-hidden="true"
        />
        <p class="alg-doc-upload__copy">
          {{ t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.MICROCOPY') }}
        </p>
        <p class="alg-doc-upload__formats">
          {{ t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.FORMATS') }}
        </p>
        <input
          ref="fileInput"
          type="file"
          multiple
          accept=".pdf,.docx,.md,.txt"
          class="alg-doc-upload__input"
          :aria-hidden="true"
          tabindex="-1"
          @change="onPick"
        />
      </div>
    </AlgAuroraBorder>

    <ul
      v-if="items.length"
      class="alg-doc-upload__list"
      :aria-label="t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.LIST_ARIA')"
    >
      <li
        v-for="item in items"
        :key="item.id"
        class="alg-doc-upload__file"
        :class="`alg-doc-upload__file--${item.state}`"
      >
        <span
          class="alg-doc-upload__state"
          :class="`alg-doc-upload__state--${item.state}`"
          :title="stateLabel(item.state)"
        >
          <span
            class="alg-doc-upload__state-glyph"
            :class="{
              'i-lucide-loader': item.state === 'uploading',
              'i-lucide-check': item.state === 'captured',
              'i-lucide-x': item.state === 'rejected',
            }"
            aria-hidden="true"
          />
          <span class="alg-doc-upload__state-label">{{
            stateLabel(item.state)
          }}</span>
        </span>
        <span class="alg-doc-upload__file-name" :title="item.name">{{
          item.name
        }}</span>
        <span class="alg-doc-upload__file-chip">{{ item.ext }}</span>
        <span class="alg-doc-upload__file-size">{{
          formatSize(item.size)
        }}</span>
        <button
          type="button"
          class="alg-doc-upload__file-remove"
          :aria-label="
            t('ALGORYTHMO_BRAIN.AJUSTAR.UPLOAD.REMOVE_ARIA', {
              name: item.name,
            })
          "
          @click="removeItem(item.id)"
        >
          <span class="i-lucide-x" aria-hidden="true" />
        </button>
        <p v-if="item.error" class="alg-doc-upload__file-error">
          {{ item.error }}
        </p>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.alg-doc-upload {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-4);
}

.alg-doc-upload__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--alg-space-2);
}

.alg-doc-upload__filter {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-snug);
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: var(--alg-radius-pill);
  background: transparent;
  border: 1px solid var(--alg-glass-border);
  color: var(--alg-fg-tertiary);
  cursor: pointer;
  transition:
    color var(--alg-duration-fast) var(--alg-ease-cinematic),
    background-color var(--alg-duration-fast) var(--alg-ease-cinematic),
    border-color var(--alg-duration-fast) var(--alg-ease-cinematic);

  &:hover {
    color: var(--alg-fg-secondary);
    border-color: var(--alg-glass-border-strong);
  }

  &--active {
    color: var(--alg-fg-inverse);
    background: var(--alg-bg-inverse);
    border-color: var(--alg-bg-inverse);
  }

  &:focus-visible {
    outline: 2px solid var(--alg-color-brand-primary);
    outline-offset: 2px;
  }
}

.alg-doc-upload__frame {
  display: block;
}

.alg-doc-upload__dropzone {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--alg-space-2);
  min-height: 148px;
  padding: var(--alg-space-6);
  border-radius: var(--alg-radius-lg);
  cursor: pointer;
  transition: background-color var(--alg-duration-fast)
    var(--alg-ease-cinematic);

  &:focus-visible {
    outline: 2px solid var(--alg-color-brand-primary);
    outline-offset: 2px;
  }

  &:hover,
  &--dragging {
    background: var(--alg-bg-elevated);
  }
}

.alg-doc-upload__glyph {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--alg-fg-tertiary);
}

.alg-doc-upload__copy {
  margin: 0;
  font-size: var(--alg-text-sm);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-secondary);
  text-align: center;
  max-width: 48ch;
}

.alg-doc-upload__formats {
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-quaternary);
}

.alg-doc-upload__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

// ── File list ─────────────────────────────────────────────────────────────────
.alg-doc-upload__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.alg-doc-upload__file {
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  align-items: center;
  gap: var(--alg-space-3);
  min-height: 40px;
  padding: var(--alg-space-2) var(--alg-space-2);
  border-bottom: 1px solid var(--alg-border);

  &:last-child {
    border-bottom: none;
  }
}

.alg-doc-upload__state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: var(--alg-radius-pill);
  border: 1px solid var(--alg-glass-border);
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-snug);
  text-transform: uppercase;
  white-space: nowrap;

  &--uploading {
    color: var(--alg-fg-tertiary);
  }
  &--captured {
    color: var(--alg-color-success);
    border-color: color-mix(
      in oklch,
      var(--alg-color-success),
      transparent 70%
    );
  }
  &--rejected {
    color: var(--alg-color-danger);
    border-color: color-mix(in oklch, var(--alg-color-danger), transparent 70%);
  }
}

.alg-doc-upload__state-glyph {
  width: 0.8rem;
  height: 0.8rem;
}
.alg-doc-upload__state--uploading .alg-doc-upload__state-glyph {
  animation: alg-doc-spin 1s linear infinite;
}

.alg-doc-upload__file-name {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-xs);
  color: var(--alg-fg-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.alg-doc-upload__file-chip {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-snug);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
  padding: 1px 6px;
  border-radius: var(--alg-radius-sm);
  background: var(--alg-bg-elevated);
}

.alg-doc-upload__file-size {
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  color: var(--alg-fg-quaternary);
  font-variant-numeric: tabular-nums;
}

.alg-doc-upload__file-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: var(--alg-fg-quaternary);
  cursor: pointer;
  border-radius: var(--alg-radius-sm);
  transition: color var(--alg-duration-fast) var(--alg-ease-cinematic);

  span {
    width: 0.8rem;
    height: 0.8rem;
  }

  &:hover {
    color: var(--alg-color-danger);
  }
  &:focus-visible {
    outline: 2px solid var(--alg-color-brand-primary);
    outline-offset: 1px;
  }
}

.alg-doc-upload__file-error {
  grid-column: 1 / -1;
  margin: 0;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  color: var(--alg-color-danger);
}

@keyframes alg-doc-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-doc-upload__state--uploading .alg-doc-upload__state-glyph {
    animation: none;
  }
}
</style>
