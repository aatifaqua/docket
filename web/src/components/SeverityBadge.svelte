<!--
  Severity badge: glyph + word, colour as reinforcement only, so the meaning survives
  monochrome displays, colour-blindness and print.
-->
<script lang="ts">
  import type { Severity } from '@docket/core';
  import { SEVERITY_LABELS } from '../lib/format.ts';

  interface Props {
    severity: Severity;
  }

  let { severity }: Props = $props();
  const label = $derived(SEVERITY_LABELS[severity]);
</script>

<span class="badge badge-{severity}">
  <span class="badge-glyph" aria-hidden="true">{label.glyph}</span>
  {label.word}
</span>
