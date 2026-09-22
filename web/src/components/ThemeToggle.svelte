<!--
  Light/dark switch. A toggle button with aria-pressed is the accessible pattern for a
  two-state control; the label stays constant and the pressed state carries the meaning.
-->
<script lang="ts">
  import { currentTheme, setTheme, type Theme } from '../lib/theme.ts';

  let theme = $state<Theme>(currentTheme());

  function toggle(): void {
    theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(theme);
  }
</script>

<button
  type="button"
  class="button button-secondary theme-toggle"
  aria-pressed={theme === 'dark'}
  onclick={toggle}
>
  <span aria-hidden="true">{theme === 'dark' ? '●' : '○'}</span>
  Dark mode
</button>
