<script setup>
// algorythmo: M8a Brain Aquário — museum-vitrine layout per plan 0005 §M8a.
// Frontend-only (M3+ data plugs in once backend stable). i18n-driven specimens.
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const anchorColumns = computed(() => [
  {
    id: 'conversas',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.COLUMNS.CONVERSAS'),
    specimens: [
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.CONVERSAS_1'),
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.CONVERSAS_2'),
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.CONVERSAS_3'),
    ],
  },
  {
    id: 'fatos',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.COLUMNS.FATOS'),
    specimens: [
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.FATOS_1'),
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.FATOS_2'),
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.FATOS_3'),
    ],
  },
]);

const secondaryColumns = computed(() => [
  {
    id: 'leads',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.COLUMNS.LEADS'),
    specimens: [
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.LEADS_1'),
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.LEADS_2'),
    ],
  },
  {
    id: 'ajustes',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.COLUMNS.AJUSTES'),
    specimens: [
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.AJUSTES_1'),
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.AJUSTES_2'),
    ],
  },
  {
    id: 'documentos',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.COLUMNS.DOCUMENTOS'),
    specimens: [
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.DOCUMENTOS_1'),
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.DOCUMENTOS_2'),
    ],
  },
  {
    id: 'decisoes',
    label: t('ALGORYTHMO_BRAIN.AQUARIO.COLUMNS.DECISOES'),
    specimens: [
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.DECISOES_1'),
      t('ALGORYTHMO_BRAIN.AQUARIO.SPECIMENS.DECISOES_2'),
    ],
  },
]);
</script>

<template>
  <section
    class="alg-aquario"
    :aria-label="t('ALGORYTHMO_BRAIN.AQUARIO.ARIA_LABEL')"
  >
    <div class="alg-aquario__strata" aria-hidden="true" />

    <div class="alg-aquario__anchor">
      <article
        v-for="(column, idx) in anchorColumns"
        :key="column.id"
        class="alg-aquario__column alg-aquario__column--anchor"
        :class="{ 'alg-aquario__column--leftmost': idx === 0 }"
      >
        <h3 class="alg-aquario__column-label">{{ column.label }}</h3>
        <ul class="alg-aquario__specimens">
          <li
            v-for="(specimen, sIdx) in column.specimens"
            :key="sIdx"
            class="alg-aquario__specimen"
          >
            {{ specimen }}
          </li>
        </ul>
      </article>
    </div>

    <div class="alg-aquario__secondary">
      <article
        v-for="(column, idx) in secondaryColumns"
        :key="column.id"
        class="alg-aquario__column alg-aquario__column--secondary"
        :class="{ 'alg-aquario__column--leftmost': idx === 0 }"
      >
        <h3 class="alg-aquario__column-label">{{ column.label }}</h3>
        <ul class="alg-aquario__specimens">
          <li
            v-for="(specimen, sIdx) in column.specimens"
            :key="sIdx"
            class="alg-aquario__specimen"
          >
            {{ specimen }}
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style scoped lang="scss">
.alg-aquario {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 1.5rem 0 3rem;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  isolation: isolate;
}

.alg-aquario__strata {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(
    180deg,
    rgba(148, 163, 184, 0.03) 0%,
    rgba(148, 163, 184, 0.015) 60%,
    transparent 100%
  );
}

.alg-aquario__anchor {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.alg-aquario__secondary {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
}

@media (max-width: 1024px) {
  .alg-aquario__secondary {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .alg-aquario__anchor,
  .alg-aquario__secondary {
    grid-template-columns: 1fr;
  }
}

.alg-aquario__column {
  padding: 0 1.75rem;
  border-left: 1px solid rgba(148, 163, 184, 0.18);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.alg-aquario__column--leftmost {
  border-left: none;
  padding-left: 0;
}

.alg-aquario__column-label {
  font-family:
    'InterDisplay',
    'Inter',
    -apple-system,
    system-ui,
    BlinkMacSystemFont,
    sans-serif;
  font-size: 10px;
  font-weight: 560;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.55);
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.alg-aquario__specimens {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alg-aquario__specimen {
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--color-body, rgba(255, 255, 255, 0.82));
  padding: 0.625rem 0.875rem;
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 4px;
  background: transparent;
}

.alg-aquario__column--anchor .alg-aquario__specimen {
  font-size: 0.875rem;
  padding: 0.875rem 1rem;
  border-color: rgba(148, 163, 184, 0.22);
}
</style>
