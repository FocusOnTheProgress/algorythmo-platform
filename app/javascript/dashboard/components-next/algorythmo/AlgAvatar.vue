<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  name: {
    type: String,
    required: true,
  },
  size: {
    type: String,
    default: 'md',
    validator: v => ['sm', 'md', 'lg'].includes(v),
  },
});

const imgFailed = ref(false);

const hasSrc = computed(() => !!props.src && !imgFailed.value);

const sizeClass = computed(() => {
  if (props.size === 'sm') return 'alg-avatar--sm';
  if (props.size === 'lg') return 'alg-avatar--lg';
  return '';
});

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return props.name.slice(0, 2).toUpperCase();
});

function hashNameToHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) % 360;
  }
  return Math.abs(hash);
}

// Deterministic gradient from name hash — no two people look the same.
const gradientStyle = computed(() => {
  const hue = hashNameToHue(props.name);
  const hue2 = (hue + 40) % 360;
  return {
    background: `linear-gradient(135deg, oklch(0.55 0.18 ${hue}), oklch(0.48 0.20 ${hue2}))`,
  };
});

function onImgError() {
  imgFailed.value = true;
}
</script>

<template>
  <div
    class="alg-avatar"
    :class="sizeClass"
    :style="!hasSrc ? gradientStyle : undefined"
    :aria-label="name"
    role="img"
  >
    <img
      v-if="hasSrc"
      :src="src"
      :alt="name"
      loading="lazy"
      @error="onImgError"
    />
    <span v-else aria-hidden="true">{{ initials }}</span>
  </div>
</template>
