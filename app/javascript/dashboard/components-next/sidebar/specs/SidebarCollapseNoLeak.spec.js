// algorythmo: M2-a — D6 collapse-no-leak spec.
// Verifies via static source analysis that SidebarGroup uses the correct
// v-show conditions so collapsed groups hide ALL sub-items (including the active one).
//
// Static analysis is preferred over component mounting because mounting SidebarGroup
// requires a Vuex store + router + policy context that's heavyweight to stub correctly.
// The template source check gives strong, reliable guarantees about the fix being in place.

import fs from 'node:fs';
import path from 'node:path';

const SIDEBAR_GROUP_PATH = path.resolve(__dirname, '..', 'SidebarGroup.vue');
const source = fs.readFileSync(SIDEBAR_GROUP_PATH, 'utf8');

// Extract only the <template> block to avoid matching comments that name the old pattern.
// The fix comment in SidebarGroup.vue intentionally quotes the buggy pattern for documentation.
const templateStart = source.indexOf('<template>');
const templateSection =
  templateStart >= 0 ? source.slice(templateStart) : source;
const scriptSection = source.slice(
  0,
  templateStart >= 0 ? templateStart : source.length
);

describe('SidebarGroup collapse no-leak (D6)', () => {
  it('children ul v-show is exactly `isExpanded` — no hasActiveChild leak', () => {
    // The children <ul> v-show must not include `|| hasActiveChild`.
    // That fallback was the leak: it kept the active child visible even when user collapsed.
    //
    // Locate the children <ul> by its `v-if="hasChildren"` anchor and read the
    // v-show within that opening tag. (A previous version assumed v-show was
    // immediately followed by the `class="...sidebar-group-children"` attribute,
    // but an `:id="..."` aria-controls attribute now sits between them.)
    const ulTagMatch = templateSection.match(
      /<ul\b[^>]*v-if="hasChildren"[^>]*>/s
    );
    expect(ulTagMatch).not.toBeNull();
    // Confirm we matched the right <ul> (the sidebar-group-children list).
    expect(ulTagMatch[0]).toContain('sidebar-group-children');

    const ulVShowMatch = ulTagMatch[0].match(/v-show="([^"]+)"/);
    expect(ulVShowMatch).not.toBeNull();
    if (ulVShowMatch) {
      const condition = ulVShowMatch[1].trim();
      expect(condition).toBe('isExpanded');
      expect(condition).not.toContain('hasActiveChild');
    }
  });

  it('leaf items v-show does not use active child name check', () => {
    // Each SidebarGroupLeaf v-show must also be just `isExpanded`.
    // The old code used `isExpanded || activeChild?.name === child.name` which leaked.
    const leafVShowMatch = templateSection.match(
      /v-show="([^"]+)"\s+v-bind="child"/
    );
    expect(leafVShowMatch).not.toBeNull();
    if (leafVShowMatch) {
      const condition = leafVShowMatch[1].trim();
      expect(condition).toBe('isExpanded');
      expect(condition).not.toContain('activeChild');
    }
  });

  it('children ul has :id attribute for aria-controls linkage', () => {
    // The ul must expose an id so the button's aria-controls can reference it (WCAG).
    // Using string concatenation to avoid the no-template-curly-in-string lint rule
    // (we intentionally check for a template literal string in Vue source).
    // eslint-disable-next-line no-template-curly-in-string
    expect(templateSection).toContain(':id="`sidebar-children-${name}`"');
  });

  it('auto-expand on active child is preserved via watch in script section', () => {
    // The watch(hasActiveChild) that auto-expands the correct sector on first load
    // must remain. Without it, navigating directly to a sub-route would land with
    // the sector collapsed and no visible active item.
    expect(scriptSection).toContain('hasActiveChild');
    expect(scriptSection).toContain('setExpandedItem');
  });
});
