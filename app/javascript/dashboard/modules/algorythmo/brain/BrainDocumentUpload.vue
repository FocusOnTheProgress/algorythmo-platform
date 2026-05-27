<script setup>
// algorythmo: M8b — Brain Document Upload. Linear-style dropzone per plan §M8b.
// Frontend-only: upload simulated, files held in local state, no POST.
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const CATEGORIES = [
  { id: 'all', labelKey: 'ALGORYTHMO_BRAIN.UPLOAD.CATEGORIES.ALL' },
  { id: 'politicas', labelKey: 'ALGORYTHMO_BRAIN.UPLOAD.CATEGORIES.POLITICAS' },
  { id: 'manuais', labelKey: 'ALGORYTHMO_BRAIN.UPLOAD.CATEGORIES.MANUAIS' },
  { id: 'regras', labelKey: 'ALGORYTHMO_BRAIN.UPLOAD.CATEGORIES.REGRAS' },
  {
    id: 'design_system',
    labelKey: 'ALGORYTHMO_BRAIN.UPLOAD.CATEGORIES.DESIGN_SYSTEM',
  },
  { id: 'outros', labelKey: 'ALGORYTHMO_BRAIN.UPLOAD.CATEGORIES.OUTROS' },
];

const files = ref([]);
const activeCategory = ref('all');
const isDragging = ref(false);
const fileInput = ref(null);

const filteredFiles = computed(() => {
  if (activeCategory.value === 'all') return files.value;
  return files.value.filter(f => f.category === activeCategory.value);
});

function extOf(name) {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : 'file';
}

function categoryFor() {
  return activeCategory.value === 'all' ? 'outros' : activeCategory.value;
}

function addFiles(list) {
  const additions = list.map(f => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: f.name,
    ext: extOf(f.name),
    size: f.size,
    category: categoryFor(),
    uploadedAt: new Date().toISOString(),
  }));
  files.value = [...additions, ...files.value];
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

function removeFile(id) {
  files.value = files.value.filter(f => f.id !== id);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<template>
  <section
    class="alg-upload"
    :aria-label="t('ALGORYTHMO_BRAIN.UPLOAD.ARIA_LABEL')"
  >
    <header class="alg-upload__filters">
      <button
        v-for="cat in CATEGORIES"
        :key="cat.id"
        type="button"
        class="alg-upload__filter"
        :class="{
          'alg-upload__filter--active': activeCategory === cat.id,
        }"
        :aria-pressed="activeCategory === cat.id"
        @click="activeCategory = cat.id"
      >
        {{ t(cat.labelKey) }}
      </button>
    </header>

    <div
      class="alg-upload__dropzone"
      :class="{ 'alg-upload__dropzone--dragging': isDragging }"
      role="button"
      tabindex="0"
      :aria-label="t('ALGORYTHMO_BRAIN.UPLOAD.DROPZONE_ARIA')"
      @click="onBrowse"
      @keydown.enter.prevent="onBrowse"
      @keydown.space.prevent="onBrowse"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <p class="alg-upload__copy">
        {{ t('ALGORYTHMO_BRAIN.UPLOAD.MICROCOPY') }}
      </p>
      <input
        ref="fileInput"
        type="file"
        multiple
        class="alg-upload__input"
        :aria-hidden="true"
        tabindex="-1"
        @change="onPick"
      />
    </div>

    <ul
      v-if="filteredFiles.length"
      class="alg-upload__list"
      :aria-label="t('ALGORYTHMO_BRAIN.UPLOAD.LIST_ARIA')"
    >
      <li v-for="file in filteredFiles" :key="file.id" class="alg-upload__file">
        <span class="alg-upload__file-name">{{ file.name }}</span>
        <span class="alg-upload__file-chip">{{ file.ext }}</span>
        <span class="alg-upload__file-size">{{ formatSize(file.size) }}</span>
        <button
          type="button"
          class="alg-upload__file-remove"
          :aria-label="
            t('ALGORYTHMO_BRAIN.UPLOAD.REMOVE_ARIA', { name: file.name })
          "
          @click="removeFile(file.id)"
        >
          <svg
            class="alg-upload__file-remove-icon"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            aria-hidden="true"
          >
            <path
              d="M1 1 L9 9 M9 1 L1 9"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </li>
    </ul>
    <p v-else class="alg-upload__empty">
      {{ t('ALGORYTHMO_BRAIN.UPLOAD.EMPTY') }}
    </p>
  </section>
</template>

<style scoped lang="scss">
.alg-upload {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1rem 0 2rem;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
}

.alg-upload__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.alg-upload__filter {
  font-family:
    'InterDisplay',
    'Inter',
    -apple-system,
    system-ui,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.01em;
  padding: 4px 10px;
  border-radius: 100px;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: rgba(148, 163, 184, 0.65);
  cursor: pointer;
  transition:
    color 120ms ease,
    background-color 120ms ease,
    border-color 120ms ease;

  &:hover {
    color: rgba(226, 232, 240, 0.85);
    border-color: rgba(148, 163, 184, 0.32);
  }

  &--active {
    color: rgba(226, 232, 240, 0.95);
    border-color: rgba(148, 163, 184, 0.45);
    background: rgba(148, 163, 184, 0.08);
  }
}

.alg-upload__dropzone {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 1.5rem 1.25rem;
  border: 1px dashed rgba(148, 163, 184, 0.32);
  border-radius: 4px;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;

  &:focus-visible {
    outline: 2px solid var(--color-woot, #6c4de5);
    outline-offset: 2px;
  }

  &:hover,
  &--dragging {
    border-color: rgba(148, 163, 184, 0.55);
    background: rgba(148, 163, 184, 0.04);
  }
}

.alg-upload__copy {
  font-size: 0.8125rem;
  line-height: 1.5;
  color: rgba(148, 163, 184, 0.75);
  max-width: 48ch;
  text-align: center;
  margin: 0;
}

.alg-upload__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.alg-upload__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.alg-upload__file {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  align-items: center;
  gap: 0.75rem;
  height: 32px;
  padding: 0 0.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  font-family: 'JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas',
    monospace;
  font-size: 12px;
  color: rgba(226, 232, 240, 0.82);

  &:last-child {
    border-bottom: none;
  }
}

.alg-upload__file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.alg-upload__file-chip {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.65);
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.08);
}

.alg-upload__file-size {
  font-size: 11px;
  color: rgba(148, 163, 184, 0.5);
  font-variant-numeric: tabular-nums;
}

.alg-upload__file-remove {
  background: transparent;
  border: none;
  color: rgba(148, 163, 184, 0.45);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  transition: color 120ms ease;

  &:hover {
    color: rgba(248, 113, 113, 0.9);
  }

  &:focus-visible {
    outline: 1px solid var(--color-woot, #6c4de5);
    outline-offset: 1px;
  }
}

.alg-upload__empty {
  font-size: 0.8125rem;
  color: rgba(148, 163, 184, 0.5);
  margin: 0;
  font-style: italic;
}
</style>
