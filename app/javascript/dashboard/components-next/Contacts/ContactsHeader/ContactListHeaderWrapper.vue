<script setup>
// algorythmo: B2 — contacts page is a single clean list + import icon.
// All header affordances except import are removed (add, export, filter
// button, sort menu, segments controls, compose-conversation).
//
// SEGMENTS / ACTIVE-FILTERS NOTE: ContactsListLayout renders
// ContactsActiveFiltersPreview on the Segments route (and when filters are
// deep-linked) and wires its @open-filter to `onToggleFilters` via template
// ref.  That edit path must remain functional — the founder's cleanup was
// scoped to the Contatos tab header, not to breaking the Segments feature.
// So `onToggleFilters` is kept fully working; the ContactsFilter overlay is
// mounted here and triggered programmatically.  No filter button is rendered
// anywhere in the header — the only entry point is the preview pill.
import { ref, computed, unref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useAlert, useTrack } from 'dashboard/composables';
import { useRouter } from 'vue-router';
import { CONTACTS_EVENTS } from 'dashboard/helper/AnalyticsHelper/events';
import filterQueryGenerator from 'dashboard/helper/filterQueryGenerator';
import contactFilterItems from 'dashboard/routes/dashboard/contacts/contactFilterItems';
import { generateValuesForEditCustomViews } from 'dashboard/helper/customViewsHelper';
import countries from 'shared/constants/countries';
import {
  useCamelCase,
  useSnakeCase,
} from 'dashboard/composables/useTransformKeys';

import ContactsHeader from 'dashboard/components-next/Contacts/ContactsHeader/ContactHeader.vue';
import ContactImportDialog from 'dashboard/components-next/Contacts/ContactsForm/ContactImportDialog.vue';
import CreateSegmentDialog from 'dashboard/components-next/Contacts/ContactsForm/CreateSegmentDialog.vue';
import DeleteSegmentDialog from 'dashboard/components-next/Contacts/ContactsForm/DeleteSegmentDialog.vue';
import ContactsFilter from 'dashboard/components-next/filter/ContactsFilter.vue';

const props = defineProps({
  headerTitle: { type: String, default: '' },
  // segmentsId + activeSegment drive onToggleFilters for segment editing.
  segmentsId: { type: [String, Number], default: 0 },
  activeSegment: { type: Object, default: null },
  hasAppliedFilters: { type: Boolean, default: false },
});

const emit = defineEmits(['applyFilter', 'clearFilters']);

const { t } = useI18n();
const store = useStore();
const router = useRouter();

// ── import ────────────────────────────────────────────────────────────────
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

// ── filter modal (segments edit + deep-linked filters) ───────────────────
// No button in the header triggers this — it is called only from
// ContactsListLayout → ContactsActiveFiltersPreview → @open-filter.
const createSegmentDialogRef = ref(null);
const deleteSegmentDialogRef = ref(null);

const showFiltersModal = ref(false);
const appliedFilter = ref([]);
const segmentsQuery = ref({});

const appliedFilters = useMapGetter('contacts/getAppliedContactFiltersV4');
const contactAttributes = useMapGetter('attributes/getContactAttributes');
const labels = useMapGetter('labels/getLabels');

const hasActiveSegments = computed(
  () => props.activeSegment && props.segmentsId !== 0
);
const activeSegmentName = computed(() => props.activeSegment?.name);

const setParamsForEditSegmentModal = () => ({
  countries,
  filterTypes: contactFilterItems,
  allCustomAttributes: useSnakeCase(contactAttributes.value),
  labels: labels.value || [],
});

const initializeSegmentToFilterModal = segment => {
  const query = unref(segment)?.query?.payload;
  if (!Array.isArray(query)) return;

  const newFilters = query.map(filter => {
    const transformed = useCamelCase(filter);
    const values = Array.isArray(transformed.values)
      ? generateValuesForEditCustomViews(
          useSnakeCase(filter),
          setParamsForEditSegmentModal()
        )
      : [];

    return {
      attributeKey: transformed.attributeKey,
      attributeModel: transformed.attributeModel,
      customAttributeType: transformed.customAttributeType,
      filterOperator: transformed.filterOperator,
      queryOperator: transformed.queryOperator ?? 'and',
      values,
    };
  });

  appliedFilter.value = [...appliedFilter.value, ...newFilters];
};

const closeAdvanceFiltersModal = () => {
  showFiltersModal.value = false;
  appliedFilter.value = [];
};

const onApplyFilter = async payload => {
  payload = useSnakeCase(payload);
  segmentsQuery.value = filterQueryGenerator(payload);
  emit('applyFilter', filterQueryGenerator(payload));
  showFiltersModal.value = false;
};

const onUpdateSegment = async (payload, segmentName) => {
  payload = useSnakeCase(payload);
  const payloadData = {
    ...props.activeSegment,
    name: segmentName,
    query: filterQueryGenerator(payload),
  };
  await store.dispatch('customViews/update', payloadData);
  closeAdvanceFiltersModal();
};

const onCreateSegment = async payload => {
  try {
    const payloadData = { ...payload, query: segmentsQuery.value };
    const response = await store.dispatch('customViews/create', payloadData);
    createSegmentDialogRef.value?.dialogRef.close();
    useAlert(
      t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.SUCCESS_MESSAGE')
    );
    const segmentId = response?.data?.id;
    if (!segmentId) return;
    router.push({
      name: 'contacts_dashboard_segments_index',
      params: { segmentId },
      query: { page: 1 },
    });
  } catch {
    useAlert(
      t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.CREATE_SEGMENT.ERROR_MESSAGE')
    );
  }
};

const onDeleteSegment = async payload => {
  try {
    await store.dispatch('customViews/delete', {
      id: Number(props.segmentsId),
      ...payload,
    });
    router.push({ name: 'contacts_dashboard_index', query: { page: 1 } });
    deleteSegmentDialogRef.value?.dialogRef.close();
    useAlert(
      t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.DELETE_SEGMENT.SUCCESS_MESSAGE')
    );
  } catch {
    useAlert(
      t('CONTACTS_LAYOUT.HEADER.ACTIONS.FILTERS.DELETE_SEGMENT.ERROR_MESSAGE')
    );
  }
};

// Exposed so ContactsListLayout can invoke it via template ref from the
// active-filters preview pill (Segments route + deep-linked filter state).
const onToggleFilters = () => {
  appliedFilter.value = [];
  if (hasActiveSegments.value) {
    initializeSegmentToFilterModal(props.activeSegment);
  } else {
    appliedFilter.value = props.hasAppliedFilters
      ? [...appliedFilters.value]
      : [
          {
            attributeKey: 'name',
            filterOperator: 'equal_to',
            values: '',
            queryOperator: 'and',
            attributeModel: 'standard',
          },
        ];
  }
  showFiltersModal.value = true;
};

defineExpose({ onToggleFilters });
</script>

<template>
  <ContactsHeader
    :header-title="headerTitle"
    @import="openContactImportDialog"
  />

  <!-- Filter overlay — no header button triggers this; entry point is the
       active-filters preview pill rendered by ContactsListLayout. -->
  <div
    v-if="showFiltersModal"
    class="fixed inset-0 z-50 flex items-start justify-center pt-20"
    @click.self="closeAdvanceFiltersModal"
  >
    <ContactsFilter
      v-model="appliedFilter"
      :segment-name="activeSegmentName"
      :is-segment-view="hasActiveSegments"
      @apply-filter="onApplyFilter"
      @update-segment="onUpdateSegment"
      @close="closeAdvanceFiltersModal"
      @clear-filters="emit('clearFilters')"
    />
  </div>

  <ContactImportDialog ref="contactImportDialogRef" @import="onImport" />
  <CreateSegmentDialog ref="createSegmentDialogRef" @create="onCreateSegment" />
  <DeleteSegmentDialog ref="deleteSegmentDialogRef" @delete="onDeleteSegment" />
</template>
