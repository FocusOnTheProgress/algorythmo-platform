// algorythmo: plan 0007 M2-g — Facilities Controle client-side persistence (D9).
// Exercises the localStorage contract end to end: add/remove a unit, add/remove
// an expense, rehydrate on remount (reload), and isolation across accounts and
// users. The store key is scoped by accountId + userId so data never leaks
// between tenants sharing a browser.
//
// Also asserts:
//   - Fixed category picklist: 7 options, stable KEY persisted (not label).
//   - amount > 0 validation (adversarial review 2026-05-28).
//   - No watermark in Controle tables (data is real, not mocked).
//   - aria-live status node presence.
//   - Legacy free-text category migration via normalizeCategoryKey.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import FacilitiesControlePane from '../FacilitiesControlePane.vue';
import {
  storageKey,
  EXPENSE_CATEGORY_KEYS,
  normalizeCategoryKey,
} from '../facilitiesStore';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    // Return the i18n key itself for most keys (passthrough for assertions).
    // For CATEGORIES.* keys return a label distinct from the key to prove the
    // component stores the KEY and displays the LABEL.
    t: (key, params) => {
      if (key.includes('.CATEGORIES.')) {
        // Return a predictable translated label: last segment lowercased.
        const seg = key.split('.').at(-1).toLowerCase();
        return `label:${seg}`;
      }
      return params ? `${key}` : key;
    },
  }),
}));

// Account + user context is injected per test so isolation can be asserted.
let accountIdRef = { value: 1 };
let currentUser = { value: { id: 7 } };

vi.mock('dashboard/composables/useAccount', () => ({
  useAccount: () => ({ accountId: accountIdRef }),
}));

vi.mock('dashboard/composables/store', () => ({
  useMapGetter: getter =>
    getter === 'auth/getCurrentUser' ? currentUser : { value: () => false },
}));

async function mountPane() {
  const wrapper = mount(FacilitiesControlePane);
  await flushPromises();
  return wrapper;
}

async function addUnit(wrapper, name, address = '') {
  await wrapper.find('#alg-facilities-unit-name').setValue(name);
  if (address) {
    await wrapper.find('#alg-facilities-unit-address').setValue(address);
  }
  await wrapper.find('.alg-control__form').trigger('submit.prevent');
}

function readStored(accountId = 1, userId = 7) {
  const raw = localStorage.getItem(storageKey(accountId, userId));
  return raw ? JSON.parse(raw) : null;
}

describe('FacilitiesControlePane — localStorage persistence (M2-g)', () => {
  beforeEach(() => {
    localStorage.clear();
    accountIdRef = { value: 1 };
    currentUser = { value: { id: 7 } };
  });

  it('starts with empty unit and expense tables', async () => {
    const wrapper = await mountPane();
    expect(wrapper.text()).toContain(
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.CONTROLE.UNITS_EMPTY'
    );
    expect(wrapper.text()).toContain(
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.CONTROLE.EXPENSES_EMPTY'
    );
  });

  it('persists a unit to localStorage scoped by account + user', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro', 'Rua A, 100');

    const stored = readStored();
    expect(stored.units).toHaveLength(1);
    expect(stored.units[0]).toMatchObject({
      name: 'Loja Centro',
      address: 'Rua A, 100',
    });
  });

  it('blocks adding a unit with a blank name', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, '   ');
    expect(readStored()).toBeNull();
  });

  it('disables the expense form until a unit exists', async () => {
    const wrapper = await mountPane();
    expect(
      wrapper.find('#alg-facilities-expense-category').attributes('disabled')
    ).toBeDefined();

    await addUnit(wrapper, 'Loja Centro');
    expect(
      wrapper.find('#alg-facilities-expense-category').attributes('disabled')
    ).toBeUndefined();
  });

  // ── Category picklist ───────────────────────────────────────────────────────

  it('category select renders exactly 7 options (plus the placeholder)', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');

    const categorySelect = wrapper.find('#alg-facilities-expense-category');
    // All options including the disabled placeholder.
    const options = categorySelect.findAll('option');
    // 1 placeholder + 7 categories.
    expect(options).toHaveLength(8);
  });

  it('category select option values are the stable keys (not translated labels)', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');

    const categorySelect = wrapper.find('#alg-facilities-expense-category');
    const optionValues = categorySelect
      .findAll('option')
      .map(o => o.attributes('value'))
      .filter(Boolean); // exclude the '' placeholder
    expect(optionValues).toEqual(EXPENSE_CATEGORY_KEYS);
  });

  it('persists the stable KEY (not the translated label) for the category', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');
    const stored = readStored();
    const unitId = stored.units[0].id;

    await wrapper.find('#alg-facilities-expense-unit').setValue(unitId);
    // Set the stable key 'energia' — the select's option value.
    await wrapper.find('#alg-facilities-expense-category').setValue('energia');
    await wrapper.find('#alg-facilities-expense-amount').setValue('1250.5');
    await wrapper.findAll('.alg-control__form')[1].trigger('submit.prevent');

    const after = readStored();
    expect(after.expenses).toHaveLength(1);
    // KEY stored, not the i18n label 'label:energia'.
    expect(after.expenses[0].category).toBe('energia');
    expect(after.expenses[0]).toMatchObject({
      unitId,
      amount: 1250.5,
    });
  });

  it('displays the translated label (not the key) for a known category in the table', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');
    const unitId = readStored().units[0].id;

    await wrapper.find('#alg-facilities-expense-unit').setValue(unitId);
    await wrapper.find('#alg-facilities-expense-category').setValue('energia');
    await wrapper.find('#alg-facilities-expense-amount').setValue('100');
    await wrapper.findAll('.alg-control__form')[1].trigger('submit.prevent');

    // i18n stub returns 'label:energia' for the ENERGIA category key.
    expect(wrapper.text()).toContain('label:energia');
    // Raw key 'energia' must not appear in the table body as a naked string.
    const tableText = wrapper.find('.alg-control__table').text();
    expect(tableText).not.toMatch(/^energia$/m);
  });

  it('rehydrates persisted rows on remount (reload)', async () => {
    const first = await mountPane();
    await addUnit(first, 'Loja Centro', 'Rua A, 100');
    first.unmount();

    const second = await mountPane();
    const rows = second.findAll('.alg-control__row');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(second.text()).toContain('Loja Centro');
    expect(second.text()).not.toContain(
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.CONTROLE.UNITS_EMPTY'
    );
  });

  it('removes a unit and cascades its expenses', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');
    const unitId = readStored().units[0].id;

    await wrapper.find('#alg-facilities-expense-unit').setValue(unitId);
    await wrapper.find('#alg-facilities-expense-category').setValue('energia');
    await wrapper.find('#alg-facilities-expense-amount').setValue('100');
    await wrapper.findAll('.alg-control__form')[1].trigger('submit.prevent');
    expect(readStored().expenses).toHaveLength(1);

    await wrapper.find('.alg-control__remove').trigger('click');

    const stored = readStored();
    expect(stored.units).toHaveLength(0);
    expect(stored.expenses).toHaveLength(0);
  });

  // ── Amount validation ───────────────────────────────────────────────────────

  it('blocks adding an expense with amount 0', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');
    const unitId = readStored().units[0].id;

    await wrapper.find('#alg-facilities-expense-unit').setValue(unitId);
    await wrapper.find('#alg-facilities-expense-category').setValue('energia');
    await wrapper.find('#alg-facilities-expense-amount').setValue('0');
    await wrapper.findAll('.alg-control__form')[1].trigger('submit.prevent');

    expect(readStored().expenses ?? []).toHaveLength(0);
  });

  it('blocks adding an expense with a negative amount', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');
    const unitId = readStored().units[0].id;

    await wrapper.find('#alg-facilities-expense-unit').setValue(unitId);
    await wrapper.find('#alg-facilities-expense-category').setValue('energia');
    await wrapper.find('#alg-facilities-expense-amount').setValue('-50');
    await wrapper.findAll('.alg-control__form')[1].trigger('submit.prevent');

    expect(readStored().expenses ?? []).toHaveLength(0);
  });

  it('blocks adding an expense with a whitespace-only amount string', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');
    const unitId = readStored().units[0].id;

    await wrapper.find('#alg-facilities-expense-unit').setValue(unitId);
    await wrapper.find('#alg-facilities-expense-category').setValue('energia');
    await wrapper.find('#alg-facilities-expense-amount').setValue('   ');
    await wrapper.findAll('.alg-control__form')[1].trigger('submit.prevent');

    expect(readStored().expenses ?? []).toHaveLength(0);
  });

  // ── No watermark on Controle tables (data is real, not mocked) ─────────────

  it('does NOT render the demonstration watermark inside Controle tables', async () => {
    const wrapper = await mountPane();
    // The Controle pane must not contain the watermark class used in the Overview.
    expect(wrapper.find('.alg-control__watermark').exists()).toBe(false);
    expect(wrapper.find('.alg-overview__watermark').exists()).toBe(false);
  });

  it('shows the "saved in this browser" hint instead', async () => {
    const wrapper = await mountPane();
    expect(wrapper.find('.alg-control__saved-hint').exists()).toBe(true);
  });

  // ── aria-live status node ───────────────────────────────────────────────────

  it('renders an aria-live polite status node for screen readers', async () => {
    const wrapper = await mountPane();
    const live = wrapper.find('[role="status"][aria-live="polite"]');
    expect(live.exists()).toBe(true);
  });

  it('updates the status node when a unit is added', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');
    const live = wrapper.find('[role="status"]');
    expect(live.text()).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.CONTROLE.STATUS_UNIT_ADDED'
    );
  });

  it('updates the status node when a unit is removed', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');
    await wrapper.find('.alg-control__remove').trigger('click');
    const live = wrapper.find('[role="status"]');
    expect(live.text()).toBe(
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.CONTROLE.STATUS_UNIT_REMOVED'
    );
  });

  // ── Isolation ──────────────────────────────────────────────────────────────

  it('does not leak data across accounts', async () => {
    const account1 = await mountPane();
    await addUnit(account1, 'Loja A1');
    account1.unmount();

    accountIdRef = { value: 2 };
    const account2 = await mountPane();
    expect(account2.text()).toContain(
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.CONTROLE.UNITS_EMPTY'
    );
    expect(account2.text()).not.toContain('Loja A1');
  });

  it('does not leak data across users on the same account', async () => {
    const user7 = await mountPane();
    await addUnit(user7, 'Loja do 7');
    user7.unmount();

    currentUser = { value: { id: 99 } };
    const user99 = await mountPane();
    expect(user99.text()).not.toContain('Loja do 7');
  });

  it('degrades to empty tables when stored JSON is corrupted', async () => {
    localStorage.setItem(storageKey(1, 7), '{ not valid json');
    const wrapper = await mountPane();
    expect(wrapper.text()).toContain(
      'ALGORYTHMO_ADMIN.SECTORS.FACILITIES.CONTROLE.UNITS_EMPTY'
    );
  });

  // ── Legacy free-text category migration ────────────────────────────────────

  it('maps an unknown legacy free-text category to "outros" on read', () => {
    expect(normalizeCategoryKey('Energia elétrica')).toBe('outros');
    expect(normalizeCategoryKey('luz')).toBe('outros');
    expect(normalizeCategoryKey('')).toBe('outros');
    expect(normalizeCategoryKey(undefined)).toBe('outros');
  });

  it('keeps valid category keys unchanged on read', () => {
    EXPENSE_CATEGORY_KEYS.forEach(key => {
      expect(normalizeCategoryKey(key)).toBe(key);
    });
  });

  it('rehydrates a legacy free-text expense as "outros" without throwing', async () => {
    const key = storageKey(1, 7);
    localStorage.setItem(
      key,
      JSON.stringify({
        units: [{ id: 'u1', name: 'Loja', address: '' }],
        expenses: [
          {
            id: 'e1',
            unitId: 'u1',
            category: 'Conta de energia', // legacy free-text
            amount: 500,
            date: '2026-01-01',
            note: '',
          },
        ],
      })
    );
    const wrapper = await mountPane();
    // Should render without error; the migrated category key is 'outros'.
    const stored = readStored();
    expect(stored.expenses[0].category).toBe('outros');
    expect(() => wrapper.text()).not.toThrow();
  });
});
