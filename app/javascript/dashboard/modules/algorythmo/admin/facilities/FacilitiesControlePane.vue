<script setup>
// algorythmo: plan 0007 M2-g — Facilities Controle (D9).
// Two client-side tables: facility units and their expenses. State persists to
// localStorage scoped by account + user (facilitiesStore.js) — v0, no backend.
//
// Design notes:
//   - Categories use STABLE KEYS (not translated labels) in localStorage so
//     stored data survives a locale switch or a label copy-edit without
//     corruption. Legacy free-text values fall back to 'outros' on read via
//     normalizeCategoryKey() in the store.
//   - Expense amount is validated > 0; zero/negative has no meaning in a spend
//     tracker (adversarial review 2026-05-28).
//   - No "DADOS DE DEMONSTRAÇÃO" watermark here — data is real (user-entered),
//     not mocked. Watermark lives only in the Overview pane (D12 contract).
//   - aria-live="polite" status node announces row additions/removals to
//     screen readers (WCAG 4.1.3).
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAccount } from 'dashboard/composables/useAccount';
import { useMapGetter } from 'dashboard/composables/store';
import {
  readState,
  writeState,
  createId,
  EXPENSE_CATEGORY_KEYS,
} from './facilitiesStore';

const { t } = useI18n();
const { accountId } = useAccount();
const currentUser = useMapGetter('auth/getCurrentUser');

const userId = computed(() => currentUser.value?.id ?? null);

// i18n path prefixes.
const C = 'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.CONTROLE';
const CAT = `${C}.CATEGORIES`;

// Resolve the translated label for a stable category key. Falls back to the
// raw key so legacy free-text (already mapped to 'outros' by the store) still
// shows something readable.
function categoryLabel(key) {
  const i18nKey = `${CAT}.${key.toUpperCase().replace(/-/g, '_')}`;
  const resolved = t(i18nKey);
  return resolved !== i18nKey ? resolved : key;
}

// Static labels resolved in one computed; keeps the template free of long keys.
const labels = computed(() => ({
  rootAria: t(`${C}.ARIA`),
  unitsTitle: t(`${C}.UNITS_TITLE`),
  unitsHint: t(`${C}.UNITS_HINT`),
  unitFormAria: t(`${C}.UNIT_FORM_ARIA`),
  unitName: t(`${C}.UNIT_NAME`),
  unitAddress: t(`${C}.UNIT_ADDRESS`),
  addUnit: t(`${C}.ADD_UNIT`),
  unitsEmpty: t(`${C}.UNITS_EMPTY`),
  expensesTitle: t(`${C}.EXPENSES_TITLE`),
  expensesHint: t(`${C}.EXPENSES_HINT`),
  expenseFormAria: t(`${C}.EXPENSE_FORM_ARIA`),
  expenseUnit: t(`${C}.EXPENSE_UNIT`),
  expenseUnitPlaceholder: t(`${C}.EXPENSE_UNIT_PLACEHOLDER`),
  expenseCategory: t(`${C}.EXPENSE_CATEGORY`),
  expenseCategoryPlaceholder: t(`${C}.EXPENSE_CATEGORY_PLACEHOLDER`),
  expenseAmount: t(`${C}.EXPENSE_AMOUNT`),
  expenseDate: t(`${C}.EXPENSE_DATE`),
  expenseNote: t(`${C}.EXPENSE_NOTE`),
  addExpense: t(`${C}.ADD_EXPENSE`),
  expensesEmpty: t(`${C}.EXPENSES_EMPTY`),
  actions: t(`${C}.ACTIONS`),
  remove: t(`${C}.REMOVE`),
  savedInBrowser: t(`${C}.SAVED_IN_BROWSER`),
  unitAdded: t(`${C}.STATUS_UNIT_ADDED`),
  unitRemoved: t(`${C}.STATUS_UNIT_REMOVED`),
  expenseAdded: t(`${C}.STATUS_EXPENSE_ADDED`),
  expenseRemoved: t(`${C}.STATUS_EXPENSE_REMOVED`),
}));

const removeUnitAria = name => t(`${C}.REMOVE_UNIT_ARIA`, { name });
const removeExpenseAria = category =>
  t(`${C}.REMOVE_EXPENSE_ARIA`, { category });

// Category options for the fixed picklist. Resolved here so the template only
// iterates a plain array without calling t() per-iteration.
const categoryOptions = computed(() =>
  EXPENSE_CATEGORY_KEYS.map(key => ({ key, label: categoryLabel(key) }))
);

// Lookup map: stable key → translated label (for the expenses table display).
const categoryLabelByKey = computed(() =>
  Object.fromEntries(categoryOptions.value.map(o => [o.key, o.label]))
);

const units = ref([]);
const expenses = ref([]);

// aria-live status: a single polite announcement replaces the previous one.
// Only the last action is announced; no queue is needed.
const liveStatus = ref('');

const unitForm = ref({ name: '', address: '' });
const expenseForm = ref({
  unitId: '',
  category: '',
  amount: '',
  date: '',
  note: '',
});

function persist() {
  writeState(accountId.value, userId.value, {
    units: units.value,
    expenses: expenses.value,
  });
}

// Load persisted state once the account/user context is known.
function hydrate() {
  const state = readState(accountId.value, userId.value);
  units.value = state.units;
  expenses.value = state.expenses;
  // Migrate-on-load: readState normalizes legacy free-text category values to
  // canonical keys in memory. Persist once so the migration survives in storage
  // — guarded to data-bearing tenants so a fresh account never gets an empty key.
  if (state.units.length || state.expenses.length) {
    persist();
  }
}

onMounted(hydrate);
// Account or user switch → re-scope to the new tenant's data (no cross-leak).
watch([accountId, userId], hydrate);

const canAddUnit = computed(() => unitForm.value.name.trim().length > 0);
const hasUnits = computed(() => units.value.length > 0);
const canAddExpense = computed(() => {
  const amount = Number(expenseForm.value.amount);
  return (
    expenseForm.value.unitId !== '' &&
    EXPENSE_CATEGORY_KEYS.includes(expenseForm.value.category) &&
    expenseForm.value.amount !== '' &&
    Number.isFinite(amount) &&
    amount > 0
  );
});

const unitNameById = computed(() =>
  Object.fromEntries(units.value.map(unit => [unit.id, unit.name]))
);

function addUnit() {
  if (!canAddUnit.value) return;
  units.value = [
    ...units.value,
    {
      id: createId(),
      name: unitForm.value.name.trim(),
      address: unitForm.value.address.trim(),
    },
  ];
  unitForm.value = { name: '', address: '' };
  persist();
  liveStatus.value = labels.value.unitAdded;
}

function removeUnit(id) {
  units.value = units.value.filter(unit => unit.id !== id);
  // Expenses orphaned by the removed unit go with it — no dangling rows.
  expenses.value = expenses.value.filter(expense => expense.unitId !== id);
  persist();
  liveStatus.value = labels.value.unitRemoved;
}

function addExpense() {
  if (!canAddExpense.value) return;
  expenses.value = [
    ...expenses.value,
    {
      id: createId(),
      unitId: expenseForm.value.unitId,
      category: expenseForm.value.category,
      amount: Number(expenseForm.value.amount),
      date: expenseForm.value.date,
      note: expenseForm.value.note.trim(),
    },
  ];
  expenseForm.value = {
    unitId: '',
    category: '',
    amount: '',
    date: '',
    note: '',
  };
  persist();
  liveStatus.value = labels.value.expenseAdded;
}

function removeExpense(id) {
  expenses.value = expenses.value.filter(expense => expense.id !== id);
  persist();
  liveStatus.value = labels.value.expenseRemoved;
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
function formatAmount(value) {
  return currency.format(Number(value) || 0);
}
</script>

<template>
  <div class="alg-control" :aria-label="labels.rootAria">
    <!-- Screen-reader live region: announces row additions/removals politely. -->
    <p
      class="alg-control__live"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ liveStatus }}
    </p>

    <section class="alg-control__block">
      <div class="alg-control__block-head">
        <h2 class="alg-control__block-title">{{ labels.unitsTitle }}</h2>
        <p class="alg-control__block-hint">{{ labels.unitsHint }}</p>
        <p class="alg-control__saved-hint">{{ labels.savedInBrowser }}</p>
      </div>

      <form
        class="alg-control__form"
        :aria-label="labels.unitFormAria"
        @submit.prevent="addUnit"
      >
        <div class="alg-control__field">
          <label
            class="alg-control__field-label"
            for="alg-facilities-unit-name"
          >
            {{ labels.unitName }}
          </label>
          <input
            id="alg-facilities-unit-name"
            v-model="unitForm.name"
            class="alg-control__input"
            type="text"
            :aria-label="labels.unitName"
          />
        </div>
        <div class="alg-control__field">
          <label
            class="alg-control__field-label"
            for="alg-facilities-unit-address"
          >
            {{ labels.unitAddress }}
          </label>
          <input
            id="alg-facilities-unit-address"
            v-model="unitForm.address"
            class="alg-control__input"
            type="text"
            :aria-label="labels.unitAddress"
          />
        </div>
        <button class="alg-control__add" type="submit" :disabled="!canAddUnit">
          {{ labels.addUnit }}
        </button>
      </form>

      <div class="alg-control__table-wrap">
        <table class="alg-control__table" :aria-label="labels.unitsTitle">
          <thead>
            <tr>
              <th class="alg-control__th" scope="col">{{ labels.unitName }}</th>
              <th class="alg-control__th" scope="col">
                {{ labels.unitAddress }}
              </th>
              <th class="alg-control__th" scope="col">{{ labels.actions }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!hasUnits">
              <td class="alg-control__empty" colspan="3">
                {{ labels.unitsEmpty }}
              </td>
            </tr>
            <tr v-for="unit in units" :key="unit.id" class="alg-control__row">
              <td class="alg-control__td">{{ unit.name }}</td>
              <td class="alg-control__td">{{ unit.address || '—' }}</td>
              <td class="alg-control__td">
                <button
                  class="alg-control__remove"
                  type="button"
                  :aria-label="removeUnitAria(unit.name)"
                  @click="removeUnit(unit.id)"
                >
                  {{ labels.remove }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="alg-control__block">
      <div class="alg-control__block-head">
        <h2 class="alg-control__block-title">{{ labels.expensesTitle }}</h2>
        <p class="alg-control__block-hint">{{ labels.expensesHint }}</p>
      </div>

      <form
        class="alg-control__form"
        :aria-label="labels.expenseFormAria"
        @submit.prevent="addExpense"
      >
        <div class="alg-control__field">
          <label
            class="alg-control__field-label"
            for="alg-facilities-expense-unit"
          >
            {{ labels.expenseUnit }}
          </label>
          <select
            id="alg-facilities-expense-unit"
            v-model="expenseForm.unitId"
            class="alg-control__select"
            :disabled="!hasUnits"
            :aria-label="labels.expenseUnit"
          >
            <option value="" disabled>
              {{ labels.expenseUnitPlaceholder }}
            </option>
            <option v-for="unit in units" :key="unit.id" :value="unit.id">
              {{ unit.name }}
            </option>
          </select>
        </div>
        <div class="alg-control__field">
          <label
            class="alg-control__field-label"
            for="alg-facilities-expense-category"
          >
            {{ labels.expenseCategory }}
          </label>
          <select
            id="alg-facilities-expense-category"
            v-model="expenseForm.category"
            class="alg-control__select"
            :disabled="!hasUnits"
            :aria-label="labels.expenseCategory"
          >
            <option value="" disabled>
              {{ labels.expenseCategoryPlaceholder }}
            </option>
            <option
              v-for="opt in categoryOptions"
              :key="opt.key"
              :value="opt.key"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="alg-control__field">
          <label
            class="alg-control__field-label"
            for="alg-facilities-expense-amount"
          >
            {{ labels.expenseAmount }}
          </label>
          <input
            id="alg-facilities-expense-amount"
            v-model="expenseForm.amount"
            class="alg-control__input"
            type="number"
            min="0.01"
            step="0.01"
            inputmode="decimal"
            :disabled="!hasUnits"
            :aria-label="labels.expenseAmount"
          />
        </div>
        <div class="alg-control__field">
          <label
            class="alg-control__field-label"
            for="alg-facilities-expense-date"
          >
            {{ labels.expenseDate }}
          </label>
          <input
            id="alg-facilities-expense-date"
            v-model="expenseForm.date"
            class="alg-control__input"
            type="date"
            :disabled="!hasUnits"
            :aria-label="labels.expenseDate"
          />
        </div>
        <div class="alg-control__field">
          <label
            class="alg-control__field-label"
            for="alg-facilities-expense-note"
          >
            {{ labels.expenseNote }}
          </label>
          <input
            id="alg-facilities-expense-note"
            v-model="expenseForm.note"
            class="alg-control__input"
            type="text"
            :disabled="!hasUnits"
            :aria-label="labels.expenseNote"
          />
        </div>
        <button
          class="alg-control__add"
          type="submit"
          :disabled="!canAddExpense"
        >
          {{ labels.addExpense }}
        </button>
      </form>

      <div class="alg-control__table-wrap">
        <table class="alg-control__table" :aria-label="labels.expensesTitle">
          <thead>
            <tr>
              <th class="alg-control__th" scope="col">
                {{ labels.expenseUnit }}
              </th>
              <th class="alg-control__th" scope="col">
                {{ labels.expenseCategory }}
              </th>
              <th class="alg-control__th" scope="col">
                {{ labels.expenseAmount }}
              </th>
              <th class="alg-control__th" scope="col">
                {{ labels.expenseDate }}
              </th>
              <th class="alg-control__th" scope="col">
                {{ labels.expenseNote }}
              </th>
              <th class="alg-control__th" scope="col">{{ labels.actions }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!expenses.length">
              <td class="alg-control__empty" colspan="6">
                {{ labels.expensesEmpty }}
              </td>
            </tr>
            <tr
              v-for="expense in expenses"
              :key="expense.id"
              class="alg-control__row"
            >
              <td class="alg-control__td">
                {{ unitNameById[expense.unitId] || '—' }}
              </td>
              <td class="alg-control__td">
                {{ categoryLabelByKey[expense.category] || expense.category }}
              </td>
              <td class="alg-control__td">
                {{ formatAmount(expense.amount) }}
              </td>
              <td class="alg-control__td">{{ expense.date || '—' }}</td>
              <td class="alg-control__td">{{ expense.note || '—' }}</td>
              <td class="alg-control__td">
                <button
                  class="alg-control__remove"
                  type="button"
                  :aria-label="
                    removeExpenseAria(
                      categoryLabelByKey[expense.category] || expense.category
                    )
                  "
                  @click="removeExpense(expense.id)"
                >
                  {{ labels.remove }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
