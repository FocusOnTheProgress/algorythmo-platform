// algorythmo: BrainDocumentUpload — upload spec (plan 0012 §9).
//
// Locks the three upload outcomes the founder cares about:
//   success  — POST resolves → row goes to "captured", `uploaded` emitted
//   rejected — client pre-check (bad type) → row "rejected", NO POST
//   failure  — POST rejects (422) → row "rejected" with the server reason
// The dropzone lazy-imports brain.service, so we mock that module.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import BrainDocumentUpload from '../BrainDocumentUpload.vue';
import { brainService } from '../brain.service';

vi.mock('../brain.service', () => ({
  brainService: {
    postDocument: vi.fn(),
  },
}));

// AlgAuroraBorder is a CSS-only frame; stub it to a passthrough so the dropzone
// slot still renders without pulling the global stylesheet.
const globalStubs = {
  AlgAuroraBorder: { template: '<div><slot /></div>' },
};

function file(name, size = 1024) {
  const f = new File(['x'], name, { type: 'application/octet-stream' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

function mountUpload() {
  return mount(BrainDocumentUpload, {
    props: { accountId: 2 },
    global: { stubs: globalStubs },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BrainDocumentUpload — success', () => {
  it('uploads a valid file, lands on "captured", and emits uploaded', async () => {
    brainService.postDocument.mockResolvedValue({ id: 9, status: 'pending' });
    const wrapper = mountUpload();
    // Simulate the drop directly (jsdom DnD is unreliable).
    await wrapper.vm.addFiles([file('manual.pdf')]);
    await flushPromises();

    expect(brainService.postDocument).toHaveBeenCalledTimes(1);
    const row = wrapper.find('.alg-doc-upload__file');
    expect(row.classes()).toContain('alg-doc-upload__file--captured');
    expect(wrapper.emitted('uploaded')).toHaveLength(1);
    expect(wrapper.emitted('uploaded')[0][0]).toEqual({
      id: 9,
      status: 'pending',
    });
  });
});

describe('BrainDocumentUpload — rejected by client pre-check', () => {
  it('rejects an unsupported extension WITHOUT calling the server', async () => {
    const wrapper = mountUpload();
    await wrapper.vm.addFiles([file('virus.exe')]);
    await flushPromises();

    expect(brainService.postDocument).not.toHaveBeenCalled();
    const row = wrapper.find('.alg-doc-upload__file');
    expect(row.classes()).toContain('alg-doc-upload__file--rejected');
    expect(row.find('.alg-doc-upload__file-error').exists()).toBe(true);
  });

  it('rejects a file over 10 MB without calling the server', async () => {
    const wrapper = mountUpload();
    await wrapper.vm.addFiles([file('huge.pdf', 11 * 1024 * 1024)]);
    await flushPromises();
    expect(brainService.postDocument).not.toHaveBeenCalled();
    expect(wrapper.find('.alg-doc-upload__file--rejected').exists()).toBe(true);
  });
});

describe('BrainDocumentUpload — server failure', () => {
  it('shows the server reason when the POST is rejected (422)', async () => {
    brainService.postDocument.mockRejectedValue({
      response: { data: { error: 'MIME mismatch' } },
    });
    const wrapper = mountUpload();
    await wrapper.vm.addFiles([file('doc.pdf')]);
    await flushPromises();

    const row = wrapper.find('.alg-doc-upload__file');
    expect(row.classes()).toContain('alg-doc-upload__file--rejected');
    expect(row.find('.alg-doc-upload__file-error').text()).toBe(
      'MIME mismatch'
    );
    expect(wrapper.emitted('uploaded')).toBeUndefined();
  });
});

describe('BrainDocumentUpload — category', () => {
  it('renders the real document categories (not "all" as a real category)', () => {
    const wrapper = mountUpload();
    const labels = wrapper
      .findAll('.alg-doc-upload__filter')
      .map(b => b.text());
    expect(labels).toEqual([
      'Policies',
      'Manuals',
      'Rules',
      'Design system',
      'Other',
    ]);
  });
});
