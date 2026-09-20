<script lang="ts">
 import { onMount } from 'svelte';
 import { animate } from 'motion';
 import edition from '$lib/content/edition.json';
 import EvidenceChart from '$lib/components/EvidenceChart.svelte';
 let header: HTMLElement;
 onMount(() => {
   const preference = matchMedia('(prefers-reduced-motion: reduce)');
   if (preference.matches) return;
   const motion = animate(header,{opacity:[.85,1]},{duration:.3});
   const stop = () => motion.complete();
   preference.addEventListener('change',stop);
   return () => {motion.stop();preference.removeEventListener('change',stop);};
 });
</script>
<svelte:head><title>{edition.title} · Mel Tucker</title><meta name="description" content="Editorial system design proof. A quiet consulting format with narrative, evidence, and visible sources."/><meta name="robots" content="noindex,nofollow"/></svelte:head>
<div class="page">
 <div class="masthead"><span class="brand">Mel Tucker</span><span class="label">Editorial system / design proof</span></div>
 <main id="main">
 <header class="edition-header" bind:this={header}>
  <div class="edition-meta"><p>Consulting format</p><p>Specimen 01</p><p>For design review</p></div>
  <div><p class="label">A working editorial standard</p><h1>{edition.title}</h1><p class="deck">Give the reader a conclusion they can assess, evidence they can follow, and a clear next consideration.</p><p class="source-note mt-6">Layout specimen. Client content is pending.</p></div>
 </header>
 {#each edition.sections as section,i}
 <section class="article-section" aria-labelledby={`section-${i}`}>
  <div class="section-index">0{i+1} / {i===0?'The argument':i===1?'The evidence':'The implication'}</div>
  <div class="prose"><h2 id={`section-${i}`}>{section.title}</h2><p>{section.body}{#if i===1}<sup><a href="#source-1" aria-label="Source 1">1</a></sup>{/if}</p>
   {#if i===0}<p>This page tests the reading experience: a measured title, a short opening, and enough space for an argument to develop. The margin gives the reader their place in the piece.</p>{/if}
   {#if i===1}<EvidenceChart/><p>Annotations should explain what the reader is seeing. Units, dates, and the origin of the data belong close enough to check while reading.</p>{/if}
   {#if i===2}<p>The consulting piece will set the substance and pace. Its sources will remain visible on screen and in the printed copy.</p>{/if}
  </div>
 </section>
 {/each}
 <section class="article-section" aria-labelledby="sources-title"><div class="section-index">References</div><div class="sources"><h2 id="sources-title">Sources &amp; notes</h2><ol><li id="source-1"><a href="https://observablehq.com/plot/">Observable Plot documentation</a><br/>Technical reference for the chart component. All values in this specimen are illustrative.</li><li><a href="https://github.com/the-pudding/svelte-starter">The Pudding’s Svelte starter</a><br/>Open-source foundation, used under the MIT license. Typography and design are original to this system.</li></ol></div></section>
 </main>
 <footer class="footer"><span>Mel Tucker · Editorial system</span><button class="no-print underline underline-offset-4" onclick={()=>window.print()}>Print / save PDF</button><span>Design proof · awaiting client copy</span></footer>
</div>
