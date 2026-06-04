// algorythmo: BrainTabAjustar — paste-knowledge spec (plan 0012 §9).
//
// Locks the paste flow wired to POST /brain/adjustments: disabled when empty,
// success (saved + cleared + emits ingested), failure (error message). The
// upload sub-flow is covered in BrainDocumentUpload.spec.js.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import BrainTabAjustar from '../BrainTabAjustar.vue';
import { brainService } from '../brain.service';

vi.mock('../brain.service', () => ({
  brainService: {
    postAdjustment: vi.fn(),
    postDocument: vi.fn(),
  },
}));

const globalStubs = {
  // BrainDocumentUpload pulls AlgAuroraBorder + brain.service lazily; stub the
  // child so this spec focuses on the paste form.
  BrainDocumentUpload: { template: '<div class="stub-upload" />' },
};

function mountAjustar() {
  return mount(BrainTabAjustar, {
    props: { accountId: 2 },
    global: { stubs: globalStubs },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BrainTabAjustar — paste validation', () => {
  it('disables submit when the content is empty', () => {
    const wrapper = mountAjustar();
    expect(
      wrapper.find('.alg-brain-ajustar__submit').attributes('disabled')
    ).toBeDefined();
  });

  it('enables submit once content is present', async () => {
    const wrapper = mountAjustar();
    await wrapper.find('.alg-brain-ajustar__textarea').setValue('a rule');
    expect(
      wrapper.find('.alg-brain-ajustar__submit').attributes('disabled')
    ).toBeUndefined();
  });
});

describe('BrainTabAjustar — paste success', () => {
  it('posts the adjustment, clears the form, and emits ingested', async () => {
    brainService.postAdjustment.mockResolvedValue({ id: 5, status: 'pending' });
    const wrapper = mountAjustar();
    await wrapper.find('.alg-brain-ajustar__input').setValue('Return policy');
    await wrapper
      .find('.alg-brain-ajustar__textarea')
      .setValue('Returns within 30 days.');
    await wrapper.find('.alg-brain-ajustar__form').trigger('submit');
    await flushPromises();

    expect(brainService.postAdjustment).toHaveBeenCalledWith(2, {
      content: 'Returns within 30 days.',
      title: 'Return policy',
    });
    // Form cleared and a confirmation shown.
    expect(wrapper.find('.alg-brain-ajustar__textarea').element.value).toBe('');
    expect(wrapper.find('.alg-brain-ajustar__feedback--ok').exists()).toBe(
      true
    );
    expect(wrapper.emitted('ingested')).toHaveLength(1);
  });

  it('omits the title when blank', async () => {
    brainService.postAdjustment.mockResolvedValue({ id: 6 });
    const wrapper = mountAjustar();
    await wrapper.find('.alg-brain-ajustar__textarea').setValue('just content');
    await wrapper.find('.alg-brain-ajustar__form').trigger('submit');
    await flushPromises();
    expect(brainService.postAdjustment).toHaveBeenCalledWith(2, {
      content: 'just content',
      title: undefined,
    });
  });
});

describe('BrainTabAjustar — paste failure', () => {
  it('shows the server error and does NOT clear the content', async () => {
    brainService.postAdjustment.mockRejectedValue({
      response: { data: { error: 'content cannot be blank' } },
    });
    const wrapper = mountAjustar();
    await wrapper.find('.alg-brain-ajustar__textarea').setValue('something');
    await wrapper.find('.alg-brain-ajustar__form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[role="alert"]').text()).toContain(
      'content cannot be blank'
    );
    expect(wrapper.find('.alg-brain-ajustar__textarea').element.value).toBe(
      'something'
    );
    expect(wrapper.emitted('ingested')).toBeUndefined();
  });
});
