<script setup>
// algorythmo: M7 atmospheric C-Levels placeholder. Rich UX per plan 0005 §9.2 (option a — glyph).
</script>

<template>
  <main
    class="alg-clevels relative flex flex-col items-center justify-center flex-1 min-h-0 py-24 px-6 text-center overflow-hidden"
  >
    <div class="alg-clevels__halo" aria-hidden="true" />

    <div class="alg-clevels__stage">
      <svg
        class="alg-clevels__glyph"
        viewBox="0 0 96 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="14"
          y="28"
          width="68"
          height="8"
          rx="2"
          stroke="currentColor"
          stroke-width="1"
          stroke-linejoin="round"
        />
        <circle
          cx="26"
          cy="18"
          r="3.25"
          stroke="currentColor"
          stroke-width="1"
        />
        <circle
          cx="48"
          cy="18"
          r="3.25"
          stroke="currentColor"
          stroke-width="1"
        />
        <circle
          cx="70"
          cy="18"
          r="3.25"
          stroke="currentColor"
          stroke-width="1"
        />
        <circle
          cx="48"
          cy="48"
          r="3.25"
          stroke="currentColor"
          stroke-width="1"
        />
      </svg>

      <h1 class="alg-clevels__title">
        {{ $t('ALGORYTHMO_ADMIN.C_LEVELS.TITLE') }}
      </h1>
      <p class="alg-clevels__body">
        {{ $t('ALGORYTHMO_ADMIN.C_LEVELS.BODY') }}
      </p>
    </div>
  </main>
</template>

<style scoped>
.alg-clevels {
  isolation: isolate;
}

.alg-clevels__halo {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(
    ellipse 480px 320px at 50% 38%,
    rgba(148, 163, 184, 0.08),
    transparent 70%
  );
  z-index: 0;
}

.alg-clevels__stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: alg-clevels-rise 360ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.alg-clevels__glyph {
  width: 96px;
  height: 64px;
  color: rgb(var(--color-slate-9));
  opacity: 0.85;
}

.alg-clevels__title {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: clamp(1.5rem, 2.2vw, 1.875rem);
  font-weight: 460;
  letter-spacing: -0.02em;
  color: rgb(var(--color-slate-12));
  margin: 0;
}

.alg-clevels__body {
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgb(var(--color-slate-10));
  max-width: 56ch;
  margin: 0;
}

@keyframes alg-clevels-rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .alg-clevels__stage {
    animation: none;
  }
}
</style>
