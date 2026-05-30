<script setup>
// algorythmo: B2 — contacts page is a single clean list + import icon.
// All affordances except import have been removed (add, export, filter,
// segments, compose-conversation).  The exposed `onToggleFilters` stub
// satisfies any parent that calls it via ref without throwing at runtime.
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore } from 'dashboard/composables/store';
import { useAlert, useTrack } from 'dashboard/composables';
import { CONTACTS_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';

import ContactsHeader from 'dashboard/components-next/Contacts/ContactsHeader/ContactHeader.vue';
import ContactImportDialog from 'dashboard/components-next/Contacts/ContactsForm/ContactImportDialog.vue';

// Only the header title needs to be forwarded to ContactsHeader.
// The remaining props passed by the parent (searchValue, activeSort, etc.)
// are intentionally ignored — they drove affordances that no longer exist.
// Vue passes undeclared bindings into $attrs; no runtime error occurs.
const { headerTitle } = defineProps({
  headerTitle: { type: String, default: '' },
});

const { t } = useI18n();
const store = useStore();

const contactImportDialogRef = ref(null);

const openContactImportDialog = () =>
  contactImportDialogRef.value?.dialogRef.open();

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

// No-op stub: ContactsListLayout calls this via template ref.  The filter
// button no longer renders, but the call-site still exists in the parent.
// The stub prevents a runtime TypeError without requiring parent changes.
const onToggleFilters = () => {};

defineExpose({ onToggleFilters });
</script>

<template>
  <ContactsHeader
    :header-title="headerTitle"
    @import="openContactImportDialog"
  />
  <ContactImportDialog ref="contactImportDialogRef" @import="onImport" />
</template>
