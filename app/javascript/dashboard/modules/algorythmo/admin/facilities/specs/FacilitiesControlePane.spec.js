// algorythmo: plan 0007 M2-g — Facilities Controle client-side persistence (D9).
// Exercises the localStorage contract end to end: add/remove a unit, add/remove
// an expense, rehydrate on remount (reload), and isolation across accounts and
// users. The store key is scoped by accountId + userId so data never leaks
// between tenants sharing a browser.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import FacilitiesControlePane from '../FacilitiesControlePane.vue';
import { storageKey } from '../facilitiesStore';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, params) => (params ? `${key}` : key) }),
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

  it('persists an expense against its unit', async () => {
    const wrapper = await mountPane();
    await addUnit(wrapper, 'Loja Centro');

    const stored = readStored();
    const unitId = stored.units[0].id;

    await wrapper.find('#alg-facilities-expense-unit').setValue(unitId);
    await wrapper.find('#alg-facilities-expense-category').setValue('Energia');
    await wrapper.find('#alg-facilities-expense-amount').setValue('1250.5');
    await wrapper.find('#alg-facilities-expense-date').setValue('2026-05-28');
    await wrapper.find('#alg-facilities-expense-note').setValue('Conta de luz');
    await wrapper.findAll('.alg-control__form')[1].trigger('submit.prevent');

    const after = readStored();
    expect(after.expenses).toHaveLength(1);
    expect(after.expenses[0]).toMatchObject({
      unitId,
      category: 'Energia',
      amount: 1250.5,
      date: '2026-05-28',
      note: 'Conta de luz',
    });
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
    await wrapper.find('#alg-facilities-expense-category').setValue('Energia');
    await wrapper.find('#alg-facilities-expense-amount').setValue('100');
    await wrapper.findAll('.alg-control__form')[1].trigger('submit.prevent');
    expect(readStored().expenses).toHaveLength(1);

    await wrapper.find('.alg-control__remove').trigger('click');

    const stored = readStored();
    expect(stored.units).toHaveLength(0);
    expect(stored.expenses).toHaveLength(0);
  });

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
});
