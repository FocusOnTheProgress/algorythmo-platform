<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStoreGetters } from 'dashboard/composables/store';

// algorythmo: G1 cinematic-os — removed OnboardingFeatureCard import.
// The four Chatwoot onboarding cards (create inbox / invite team / canned responses
// / labels) are pure Chatwoot product content and do not belong in Algorythmo OS.
// The greeting + description copy stays because it is brand-neutral and carries
// the operator's name correctly. Cards are gone; import cleaned up.

const getters = useStoreGetters();
const { t } = useI18n();
const globalConfig = computed(() => getters['globalConfig/get'].value);
const currentUser = computed(() => getters.getCurrentUser.value);

const greetingMessage = computed(() => {
  const hours = new Date().getHours();
  let translationKey;
  if (hours < 12) {
    translationKey = 'ONBOARDING.GREETING_MORNING';
  } else if (hours < 18) {
    translationKey = 'ONBOARDING.GREETING_AFTERNOON';
  } else {
    translationKey = 'ONBOARDING.GREETING_EVENING';
  }
  return t(translationKey, {
    name: currentUser.value.name,
    installationName: globalConfig.value.installationName,
  });
});
</script>

<template>
  <div
    class="min-h-screen max-w-2xl mx-auto flex flex-col justify-center gap-3 p-8 w-full font-inter overflow-auto"
  >
    <p
      class="text-xl font-semibold text-n-slate-12 font-interDisplay tracking-[0.3px]"
    >
      {{ greetingMessage }}
    </p>
    <p class="text-n-slate-11 text-base">
      {{
        $t('ONBOARDING.DESCRIPTION', {
          installationName: globalConfig.installationName,
        })
      }}
    </p>
  </div>
</template>
