import { fingerprintSource } from './scripts/validate-release.mjs';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
export default { preprocess: vitePreprocess(), kit: { version: {name: fingerprintSource()}, adapter: adapter({strict:true}), paths: {base:'/mel-editorial-system'} } };
