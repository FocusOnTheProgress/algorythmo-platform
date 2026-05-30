<script setup>
// algorythmo: B2 — contacts page shows the list + a single import icon.
// All extraneous affordances (filter, sort, save-segment, delete-segment,
// add-contact, export, compose-conversation) are removed.  Import remains
// as a single ghost icon button, consistent with the plan spec.
import Button from 'dashboard/components-next/button/Button.vue';

defineProps({
  headerTitle: { type: String, required: true },
});

const emit = defineEmits(['import']);
</script>

<template>
  <header class="sticky top-0 z-20 px-6">
    <div
      class="flex items-center justify-between w-full py-6 gap-2 mx-auto max-w-5xl"
    >
      <span class="text-xl font-medium truncate text-n-slate-12">
        {{ headerTitle }}
      </span>
      <Button
        icon="i-lucide-download"
        color="slate"
        size="sm"
        variant="ghost"
        :aria-label="
          $t('CONTACTS_LAYOUT.HEADER.ACTIONS.CONTACT_CREATION.IMPORT_CONTACT')
        "
        @click="emit('import')"
      />
    </div>
  </header>
</template>
