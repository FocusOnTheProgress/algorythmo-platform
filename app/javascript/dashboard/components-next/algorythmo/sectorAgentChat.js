// algorythmo: shared contract for the sector agent chat (DESIGN.md §5.12, G5)
//
// The sector agent chat is the LAST element of every sector overview (a
// full-width block, NOT a right rail). A small trigger at the top of the page
// smooth-scrolls to it. Both the trigger and the chat derive the same DOM
// anchor id from the sector slug so the scroll target is stable and unique
// per sector.

// Build the scroll-anchor id for a given sector slug. Kept in one place so the
// trigger and the chat can never drift apart.
export function sectorAgentChatAnchorId(sector) {
  const slug = String(sector || 'setor')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accent marks
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `alg-sector-agent-chat-${slug || 'setor'}`;
}

// Smooth-scroll to a sector's agent chat, respecting reduced-motion.
export function scrollToSectorAgentChat(sector) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(sectorAgentChatAnchorId(sector));
  if (!el) return;
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({
    behavior: prefersReduced ? 'auto' : 'smooth',
    block: 'start',
  });
}
