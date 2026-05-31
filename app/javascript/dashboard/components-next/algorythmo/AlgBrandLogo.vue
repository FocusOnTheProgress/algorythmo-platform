<script setup>
// algorythmo: Cinematic OS — configured brand logo for the sidebar chrome.
//
// ROOT CAUSE this fixes (founder LIVE review, "the logo I upload in settings
// still doesn't appear top-left; a different icon shows instead"): a prior build
// hard-wired the sidebar brand slot to the inline <AlgBrandMark> SVG, so the
// account/installation logo the founder uploads in the configuration tab could
// NEVER render — a fixed glyph always won.
//
// FIX: resolve the CONFIGURED logo and render it as an <img>, in precedence:
//   1. account.logo_url  — the brand logo the admin UPLOADS in account settings
//                          (Active Storage attachment; SVG-safe, see
//                          Account#logo_url). This is what the founder uploads.
//   2. account.logo      — enrichment-populated logo URL (custom_attributes.logo)
//   3. globalConfig.logoThumbnail — installation-level brand logo
//   4. <AlgBrandMark>     — last-resort inline mark, ONLY when nothing is set, so
//                          the brand slot never collapses to an empty gap.
//
// Keeping AlgBrandMark strictly as the no-logo fallback is the contract: the
// moment a logo is configured, THAT logo appears in both the expanded sidebar
// and the collapsed account-switcher trigger.
import { computed } from 'vue';
import { useMapGetter } from 'dashboard/composables/store';
import AlgBrandMark from 'dashboard/components-next/algorythmo/AlgBrandMark.vue';

defineProps({
  // Accessible label for the rendered logo image.
  label: {
    type: String,
    default: 'Logo',
  },
  // Decorative when a brand/account name sits beside it (avoids double-announce).
  decorative: {
    type: Boolean,
    default: false,
  },
});

const globalConfig = useMapGetter('globalConfig/get');
const getAccount = useMapGetter('accounts/getAccount');
const currentAccountId = useMapGetter('getCurrentAccountId');

const logoSource = computed(() => {
  const account = getAccount.value?.(currentAccountId.value) || {};
  return (
    account.logo_url || account.logo || globalConfig.value?.logoThumbnail || ''
  );
});
</script>

<template>
  <img
    v-if="logoSource"
    :src="logoSource"
    :alt="decorative ? '' : label"
    :aria-hidden="decorative ? 'true' : undefined"
    class="object-contain w-full h-full"
  />
  <AlgBrandMark v-else :label="label" :decorative="decorative" />
</template>
