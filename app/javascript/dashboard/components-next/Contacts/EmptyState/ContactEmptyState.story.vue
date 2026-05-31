<script setup>
import ContactEmptyState from './ContactEmptyState.vue';
</script>

<template>
  <Story
    title="Components/Contacts/EmptyState"
    :layout="{ type: 'grid', width: '900px' }"
  >
    <!-- algorythmo: stream-b — Hero-band empty state (plan 0011).
         Self-contained component: no props, no events.
         All copy lives in i18n; import is wired internally. -->
    <Variant title="Default">
      <ContactEmptyState />
    </Variant>
  </Story>
</template>
