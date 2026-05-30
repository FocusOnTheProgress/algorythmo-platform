<script setup>
// algorythmo: Brain ingestion dropzone — the "borda brilhante animada".
//
// A signature surface where the intelligence INGESTS, so it earns the Aurora
// Border (the only sanctioned chrome-adjacent home of the Aurora gradient, with
// glow). Frontend-only / demo: there is no upload backend yet, so @dragover /
// @drop only drive the "armed" hover state — the border quickens and the
// dropzone lifts — to show the surface is alive and reacts to a real drag.
//
// Frontend-only demo: the component owns the dragenter/leave/over/drop
// bookkeeping and the "armed" state internally; there is no parent contract.
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { AlgAuroraBorder } from 'dashboard/components-next/algorythmo';

const { t } = useI18n();

// Depth counter: dragenter/leave fire for descendants too, so a boolean would
// flicker. Counting enter/leave keeps the armed state stable across children.
const dragDepth = ref(0);
const armed = ref(false);

function setArmed(value) {
  armed.value = value;
}

function onDragEnter() {
  dragDepth.value += 1;
  if (!armed.value) setArmed(true);
}

function onDragLeave() {
  dragDepth.value = Math.max(0, dragDepth.value - 1);
  if (dragDepth.value === 0) setArmed(false);
}

function onDragOver(e) {
  // Required so the drop event can fire; demo only — we never read the files.
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
}

function onDrop() {
  // Demo: swallow the drop, reset the armed state. No upload backend yet.
  dragDepth.value = 0;
  setArmed(false);
}
</script>

<template>
  <AlgAuroraBorder
    as="section"
    radius="var(--alg-radius-2xl)"
    intensity="normal"
    glow
    :active="armed"
    class="alg-brain-dropzone"
    :class="{ 'alg-brain-dropzone--armed': armed }"
    :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.DROPZONE.ARIA_LABEL')"
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @dragover.prevent="onDragOver"
    @drop.prevent="onDrop"
  >
    <div class="alg-brain-dropzone__inner">
      <span
        class="alg-brain-dropzone__icon i-lucide-upload-cloud"
        aria-hidden="true"
      />
      <div class="alg-brain-dropzone__copy">
        <p class="alg-brain-dropzone__title">
          {{ t('ALGORYTHMO_BRAIN.AQUARIO.DROPZONE.TITLE') }}
        </p>
        <p class="alg-brain-dropzone__hint">
          {{ t('ALGORYTHMO_BRAIN.AQUARIO.DROPZONE.HINT') }}
        </p>
      </div>
      <span class="alg-brain-dropzone__formats">
        {{ t('ALGORYTHMO_BRAIN.AQUARIO.DROPZONE.FORMATS') }}
      </span>
    </div>
  </AlgAuroraBorder>
</template>

<style scoped lang="scss">
.alg-brain-dropzone {
  display: block;
}

// The inner surface is glass-soft so the aurora border frames a real material,
// not a hole. Grain comes via the surface background tokens already; the border
// owns the aurora identity.
.alg-brain-dropzone__inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--alg-space-5);
  padding: var(--alg-space-6) var(--alg-space-8);
  border-radius: var(--alg-radius-2xl);
  background: var(--alg-glass-soft-bg, var(--alg-bg-elevated));
  box-shadow: var(--alg-glass-highlight);
  transition:
    transform var(--alg-duration-base) var(--alg-ease-cinematic),
    background var(--alg-duration-base) var(--alg-ease-cinematic);

  @supports (backdrop-filter: blur(1px)) {
    backdrop-filter: var(--alg-glass-soft-filter);
    -webkit-backdrop-filter: var(--alg-glass-soft-filter);
  }
}

.alg-brain-dropzone--armed .alg-brain-dropzone__inner {
  transform: translateY(-1px);
  background: var(--alg-glass-medium-bg, var(--alg-bg-elevated));
}

.alg-brain-dropzone__icon {
  width: 1.5rem;
  height: 1.5rem;
  flex: none;
  color: var(--alg-fg-secondary);
  transition: color var(--alg-duration-base) var(--alg-ease-cinematic);
}

.alg-brain-dropzone--armed .alg-brain-dropzone__icon {
  color: var(--alg-fg-primary);
}

.alg-brain-dropzone__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.alg-brain-dropzone__title {
  margin: 0;
  font-size: var(--alg-text-sm);
  font-weight: var(--alg-weight-medium);
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
}

.alg-brain-dropzone__hint {
  margin: 0;
  font-size: var(--alg-text-xs);
  line-height: var(--alg-leading-normal);
  color: var(--alg-fg-tertiary);
}

.alg-brain-dropzone__formats {
  flex: none;
  font-family: var(--alg-font-mono);
  font-size: var(--alg-text-2xs);
  letter-spacing: var(--alg-tracking-wide);
  text-transform: uppercase;
  color: var(--alg-fg-quaternary);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .alg-brain-dropzone__inner {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--alg-space-3);
    text-align: left;
  }

  .alg-brain-dropzone__formats {
    align-self: flex-start;
  }
}
</style>
