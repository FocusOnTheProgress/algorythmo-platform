<script setup>
// algorythmo: Cinematic OS motion primitive — Typewriter (DESIGN.md §3.7)
//
// Types a line of text out character by character, the way the sector agent
// "speaks" its opening line. A soft caret blinks while typing and settles when
// done. Under prefers-reduced-motion the full text renders instantly with no
// caret motion — the line is identity-present, not animated (DESIGN.md §3.7).
//
// Accessibility: the full text is always exposed via aria-label on the root;
// the visually-typed span is aria-hidden, so assistive tech reads the complete
// line immediately regardless of typing state.
import { ref, watch, onBeforeUnmount, onMounted } from 'vue';

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  // Milliseconds per character.
  speed: {
    type: Number,
    default: 26,
  },
  // Delay before the first character appears.
  startDelay: {
    type: Number,
    default: 220,
  },
  // Show the blinking caret.
  caret: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['done']);

const shown = ref('');
const typing = ref(false);
let timers = [];

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const clearTimers = () => {
  timers.forEach(clearTimeout);
  timers = [];
};

const finish = () => {
  shown.value = props.text;
  typing.value = false;
  emit('done');
};

const run = () => {
  clearTimers();
  shown.value = '';

  if (reducedMotion() || !props.text) {
    finish();
    return;
  }

  typing.value = true;
  const chars = Array.from(props.text);
  chars.forEach((_, i) => {
    timers.push(
      setTimeout(
        () => {
          shown.value = chars.slice(0, i + 1).join('');
          if (i === chars.length - 1) {
            typing.value = false;
            emit('done');
          }
        },
        props.startDelay + i * props.speed
      )
    );
  });
};

onMounted(run);
watch(() => props.text, run);
onBeforeUnmount(clearTimers);
</script>

<template>
  <span class="alg-typewriter" :aria-label="text">
    <span class="alg-typewriter__text" aria-hidden="true">{{ shown }}</span>
    <span
      v-if="caret"
      class="alg-typewriter__caret"
      :class="{ 'alg-typewriter__caret--idle': !typing }"
      aria-hidden="true"
    />
  </span>
</template>

<style lang="scss" scoped>
.alg-typewriter {
  display: inline;
}

.alg-typewriter__text {
  white-space: pre-wrap;
}

// Caret — a soft vertical bar in the brand hue, riding the baseline.
.alg-typewriter__caret {
  display: inline-block;
  width: 2px;
  height: 1em;
  margin-inline-start: 2px;
  vertical-align: text-bottom;
  border-radius: var(--alg-radius-pill);
  background: var(--alg-color-brand-primary);
  animation: alg-typewriter-blink var(--alg-duration-ambient-fast)
    var(--alg-ease-ambient) infinite;
}

// When idle (done typing), the caret breathes more slowly, then is unobtrusive.
.alg-typewriter__caret--idle {
  opacity: 0.45;
  animation-duration: var(--alg-duration-ambient-slow);
}

@keyframes alg-typewriter-blink {
  0%,
  100% {
    opacity: 0.9;
  }
  50% {
    opacity: 0.15;
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-typewriter__caret {
    animation: none;
    opacity: 0.4;
  }
}
</style>
