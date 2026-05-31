<script setup>
// algorythmo: stream-b — plan 0011 — Hero-band empty state (Brief v3).
//
// Design ruler:
//   • Subtraction first: no ghost cards, no "Add contact" filled button.
//   • 8pt grid: pt-24 (96px) small, pt-32 (128px) large.
//   • Typography: weight 300/400, white in 4 opacity tiers — never pure #FFF.
//   • The "+" is an icon (i-lucide-plus, size-5, text-n-slate-9) — subtle, NOT a button shape.
//   • Import link is a text affordance, not a primary CTA.
//   • Entrance via useAlgMotion (cinematic curve, reduced-motion respected).
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import ContactImportDialog from 'dashboard/components-next/Contacts/ContactsForm/ContactImportDialog.vue';
import { useStore } from 'dashboard/composables/store';
import { useAlert, useTrack } from 'dashboard/composables';
import { CONTACTS_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import { useAlgMotion } from 'dashboard/composables/algorythmo/useAlgMotion';

const { t } = useI18n();
const store = useStore();

const rootRef = ref(null);
const contactImportDialogRef = ref(null);
const { revealChildren } = useAlgMotion(rootRef);

const openImport = () => contactImportDialogRef.value?.dialogRef.open();

const onImport = async file => {
  try {
    await store.dispatch('contacts/import', file);
    contactImportDialogRef.value?.dialogRef.close();
    useAlert(
      t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.SUCCESS_MESSAGE')
    );
    useTrack(CONTACTS_EVENTS.IMPORT_SUCCESS);
  } catch (error) {
    useAlert(
      error.message ??
        t('CONTACTS_LAYOUT.HEADER.ACTIONS.IMPORT_CONTACT.ERROR_MESSAGE')
    );
    useTrack(CONTACTS_EVENTS.IMPORT_FAILURE);
  }
};

onMounted(() => {
  // Stagger headline → icon → import link in sequence.
  revealChildren('[data-alg-reveal]', { y: 8, each: 0.08, startDelay: 0.06 });
});
</script>

<template>
  <!-- algorythmo: stream-b — Hero-band empty state. Generous vertical padding,
       editorial headline at low opacity, single subtle "+" icon, import link.
       The emptiness is the asset — no ghost cards or filled buttons. -->
  <section
    ref="rootRef"
    class="flex flex-col items-center justify-center w-full h-full px-6"
  >
    <div
      class="flex flex-col items-center gap-6 pt-24 lg:pt-32 pb-8 text-center max-w-sm"
    >
      <!-- Headline — editorial, ghostly opacity -->
      <h2
        data-alg-reveal
        class="text-2xl font-light tracking-tight text-n-slate-12/40 leading-snug"
      >
        {{ t('CONTACTS_LAYOUT.EMPTY_STATE.HERO_HEADLINE') }}
      </h2>

      <!-- Subtitle — smaller, even more receded -->
      <p
        data-alg-reveal
        class="text-sm font-light tracking-wide text-n-slate-11/50 leading-relaxed -mt-2"
      >
        {{ t('CONTACTS_LAYOUT.EMPTY_STATE.HERO_SUBTITLE') }}
      </p>

      <!-- Subtle "+" icon — the only creation affordance -->
      <button
        data-alg-reveal
        type="button"
        class="flex items-center justify-center size-9 rounded-full text-n-slate-9 hover:text-n-slate-11 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-n-brand transition-colors duration-200"
        :aria-label="t('CONTACTS_LAYOUT.EMPTY_STATE.HERO_ADD_ARIA')"
        @click="openImport"
      >
        <span class="i-lucide-plus size-5" aria-hidden="true" />
      </button>

      <!-- Import text link -->
      <button
        data-alg-reveal
        type="button"
        class="text-xs font-light text-n-slate-10/70 hover:text-n-slate-11 underline underline-offset-2 decoration-n-slate-9/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-n-brand rounded-sm -mt-2"
        @click="openImport"
      >
        {{ t('CONTACTS_LAYOUT.EMPTY_STATE.HERO_IMPORT_LINK') }}
      </button>
    </div>

    <ContactImportDialog ref="contactImportDialogRef" @import="onImport" />
  </section>
</template>
