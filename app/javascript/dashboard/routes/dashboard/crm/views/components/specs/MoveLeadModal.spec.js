// algorythmo: feature-gate algorythmo_crm
import { describe, it, expect, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createI18n } from 'vue-i18n';
import MoveLeadModal from '../MoveLeadModal.vue';
import algorythmoCrm from 'dashboard/i18n/locale/pt_BR/algorythmoCrm.json';

const i18n = createI18n({
  legacy: false,
  locale: 'pt_BR',
  messages: { pt_BR: algorythmoCrm },
});

const stages = [
  { id: 1, name: 'Novo', kind: 'open' },
  { id: 2, name: 'Qualificado', kind: 'open' },
  { id: 3, name: 'Proposta', kind: 'open' },
];

const lead = { id: 42, name: 'Maria Santos', stage_id: 1 };

const mountModal = (props = {}) =>
  mount(MoveLeadModal, {
    attachTo: document.body,
    props: { open: true, lead, stages, ...props },
    global: { plugins: [i18n] },
  });

describe('MoveLeadModal (CONTRACT_M1B §6)', () => {
  let wrappers = [];

  afterEach(() => {
    wrappers.forEach(w => w.unmount());
    wrappers = [];
    document.body.innerHTML = '';
  });

  function track(w) {
    wrappers.push(w);
    return w;
  }

  describe('shell + a11y', () => {
    it('renders role="dialog" with aria-modal and the contract testid', async () => {
      track(mountModal());
      await nextTick();
      const dialog = document.querySelector('[data-testid="move-lead-modal"]');
      expect(dialog).toBeTruthy();
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('data-lead-id')).toBe('42');
    });

    it('only mounts when open=true', () => {
      track(mountModal({ open: false }));
      expect(
        document.querySelector('[data-testid="move-lead-modal"]')
      ).toBeNull();
    });
  });

  describe('stage selection', () => {
    it('excludes the lead current stage from the radio options', () => {
      track(mountModal());
      const radios = document.querySelectorAll(
        '[data-testid^="move-stage-radio-"]'
      );
      const values = Array.from(radios).map(r => r.getAttribute('value'));
      expect(values).not.toContain('1');
      expect(values).toEqual(['2', '3']);
    });

    it('disables confirm until a stage is picked, then emits on submit', async () => {
      const wrapper = track(mountModal());
      await nextTick();
      const confirm = document.querySelector(
        '[data-testid="move-lead-modal-confirm"]'
      );
      // First reachable radio is auto-selected on open — confirm is enabled.
      expect(confirm.disabled).toBe(false);

      const radio3 = document.querySelector(
        '[data-testid="move-stage-radio-3"]'
      );
      radio3.checked = true;
      radio3.dispatchEvent(new Event('change', { bubbles: true }));
      await nextTick();

      const form = document.querySelector(
        '[data-testid="move-lead-modal"] form'
      );
      form.dispatchEvent(new Event('submit', { cancelable: true }));
      await nextTick();

      const events = wrapper.emitted('confirm');
      expect(events).toBeTruthy();
      expect(events[0][0]).toEqual({
        leadId: 42,
        stage: { id: 3, name: 'Proposta', kind: 'open' },
      });
    });
  });

  describe('escape + cancel', () => {
    it('emits close on Escape', async () => {
      const wrapper = track(mountModal());
      await nextTick();
      const dialog = document.querySelector('[data-testid="move-lead-modal"]');
      dialog.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      await nextTick();
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('emits close when the cancel button is clicked', async () => {
      const wrapper = track(mountModal());
      await nextTick();
      document.querySelector('[data-testid="move-lead-modal-cancel"]').click();
      await nextTick();
      expect(wrapper.emitted('close')).toBeTruthy();
    });
  });
});
