import { computed } from 'vue';
import { useRoute } from 'vue-router';

// algorythmo: stream-a — "Operação ao vivo" read-only aquarium.
//
// Read-only is derived from a DURABLE source — `route.meta.isReadOnly` — set on
// the aquarium routes (alg_operacao_ao_vivo + alg_operacao_ao_vivo_conversation).
// Deriving from route meta (instead of threading a per-route boolean prop) means
// EVERY conversation opened under the aquarium path inherits read-only, regardless
// of which component reads it or how the user navigated there. Any component in the
// conversation surface can call this without prop drilling.
//
// This is UI-level suppression only — it hides the customer-mutation surface (reply
// box, macros panel, send-to-customer header actions). It is NOT server-side
// enforcement; a determined operator could still mutate via the API.
export function useReadOnlyView() {
  const route = useRoute();
  const isReadOnly = computed(() => Boolean(route?.meta?.isReadOnly));
  return { isReadOnly };
}
