import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { applyTheme, savedTheme } from './lib/theme.ts';

// Apply a remembered colour scheme before the first paint so the page does not flash.
applyTheme(savedTheme());

const target = document.getElementById('app');
if (target === null) throw new Error('Missing #app mount point');

mount(App, { target });
