<script setup>
defineProps({
  message: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <!-- algorythmo: cinematic-os C1.1 — purge Chatwoot blue (bg-woot-400) for the
       brand cyan-teal fill; _chrome.scss pairs .bg-n-brand with a dark fg. -->
  <div class="w-full mb-4 flex items-center justify-end">
    <div
      v-dompurify-html="message"
      class="px-4 py-3 bg-n-brand text-sm rounded-md inline-block"
    />
  </div>
</template>
