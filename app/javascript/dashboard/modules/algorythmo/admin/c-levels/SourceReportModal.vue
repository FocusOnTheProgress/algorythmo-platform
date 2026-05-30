<script setup>
// algorythmo: Stream E2 — Source Report panel (opened from a Data Pill).
//
// DEMO: shows a stub "relatório de origem" for the cited figure so the trace
// from claim → number → report reads end-to-end. The layout is a real report
// shell (header figure, provenance line, a few line items) so the real report
// drops in without restructuring.
//
// TODO(real-wiring): replace the stub line items with the actual source report
// fetched by `figure.reportKey` (a real report id in the OS reports layer).
import { useI18n } from 'vue-i18n';
import CLevelsModal from './CLevelsModal.vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  figure: { type: Object, default: null },
});

const emit = defineEmits(['update:open']);

const { t } = useI18n();

// Stub provenance rows shared by all figures — illustrative, not real data.
const rows = [
  'ALGORYTHMO_ADMIN.C_LEVELS.REPORT.ROW_PERIOD',
  'ALGORYTHMO_ADMIN.C_LEVELS.REPORT.ROW_SOURCE',
  'ALGORYTHMO_ADMIN.C_LEVELS.REPORT.ROW_METHOD',
];
</script>

<template>
  <CLevelsModal
    :open="open"
    :title="t('ALGORYTHMO_ADMIN.C_LEVELS.REPORT.TITLE')"
    :close-label="t('ALGORYTHMO_ADMIN.C_LEVELS.MODAL.CLOSE')"
    root-testid="cl-source-report"
    @update:open="emit('update:open', $event)"
  >
    <div v-if="figure" class="alg-cl-report">
      <p class="alg-cl-report__demo">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.REPORT.DEMO_BADGE') }}
      </p>

      <div class="alg-cl-report__figure">
        <span class="alg-cl-report__value">{{ t(figure.labelKey) }}</span>
        <span class="alg-cl-report__source">{{ t(figure.reportKey) }}</span>
      </div>

      <dl class="alg-cl-report__rows">
        <div
          v-for="(rowKey, i) in rows"
          :key="rowKey"
          class="alg-cl-report__row"
        >
          <dt>{{ t(`${rowKey}.LABEL`) }}</dt>
          <dd>{{ t(`${rowKey}.VALUE`) }}</dd>
          <span v-if="i < rows.length - 1" class="alg-cl-report__hr" aria-hidden="true" />
        </div>
      </dl>

      <p class="alg-cl-report__note">
        {{ t('ALGORYTHMO_ADMIN.C_LEVELS.REPORT.NOTE') }}
      </p>
    </div>
  </CLevelsModal>
</template>

<style lang="scss" scoped>
.alg-cl-report {
  display: flex;
  flex-direction: column;
  gap: var(--alg-space-5);
}

.alg-cl-report__demo {
  margin: 0;
  align-self: flex-start;
  font-size: 9px;
  letter-spacing: var(--alg-tracking-widest);
  text-transform: uppercase;
  color: var(--alg-fg-tertiary);
  padding: 2px var(--alg-space-2);
  border: 1px solid var(--alg-border);
  border-radius: var(--alg-radius-pill);
}

.alg-cl-report__figure {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: var(--alg-space-4);
  border-bottom: 1px solid var(--alg-border);
}

.alg-cl-report__value {
  font-size: var(--alg-text-2xl);
  font-weight: 500;
  letter-spacing: var(--alg-tracking-tight);
  color: var(--alg-fg-primary);
  font-variant-numeric: tabular-nums;
}

.alg-cl-report__source {
  font-size: var(--alg-text-xs);
  color: var(--alg-fg-tertiary);
}

.alg-cl-report__rows {
  margin: 0;
  display: flex;
  flex-direction: column;
}

.alg-cl-report__row {
  position: relative;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--alg-space-4);
  padding: var(--alg-space-3) 0;

  dt {
    font-size: var(--alg-text-xs);
    letter-spacing: var(--alg-tracking-widest);
    text-transform: uppercase;
    color: var(--alg-fg-tertiary);
  }
  dd {
    margin: 0;
    font-size: var(--alg-text-sm);
    color: var(--alg-fg-primary);
    text-align: right;
  }
}

.alg-cl-report__hr {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: var(--alg-border);
}

.alg-cl-report__note {
  margin: 0;
  font-size: var(--alg-text-xs);
  line-height: 1.55;
  color: var(--alg-fg-tertiary);
}
</style>
