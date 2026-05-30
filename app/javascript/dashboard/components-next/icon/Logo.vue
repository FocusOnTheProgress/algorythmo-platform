<script setup>
import { computed, useAttrs } from 'vue';
import { useMapGetter } from 'dashboard/composables/store';

const attrs = useAttrs();
const globalConfig = useMapGetter('globalConfig/get');
const getAccount = useMapGetter('accounts/getAccount');
const currentAccountId = useMapGetter('getCurrentAccountId');

// Precedence: the client's uploaded account logo wins over the global
// installation logo. The Chatwoot mark is intentionally absent — the no-logo
// state must never fall back to it.
const logoSource = computed(() => {
  const account = getAccount.value?.(currentAccountId.value) || {};
  return account.logo_url || globalConfig.value?.logoThumbnail || '';
});
</script>

<template>
  <img
    v-if="logoSource"
    v-bind="attrs"
    :src="logoSource"
    class="object-contain"
  />
  <!-- No logo set (and no installation logo): a neutral placeholder, never the
       Chatwoot mark. Mirrors the i-lucide-image glyph used in the settings
       preview so the brand slot never collapses to an empty gap. -->
  <span
    v-else
    v-bind="attrs"
    class="i-lucide-image text-n-slate-10"
    aria-hidden="true"
  />
</template>
