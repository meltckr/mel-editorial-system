<script lang="ts">
 import { onMount } from 'svelte';
 import * as Plot from '@observablehq/plot';
 let host: HTMLDivElement;
 const data = [{stage:'First review',days:8},{stage:'Second review',days:5},{stage:'Final review',days:3}];
 onMount(() => {
   const draw = () => {
     const style = getComputedStyle(host);
     const chart = Plot.plot({width:host.clientWidth,height:280,marginLeft:96,marginRight:42,
       style:{background:'transparent',color:style.getPropertyValue('--color-ink'),fontSize:'12px'},
       x:{label:'Illustrative elapsed time · days',domain:[0,10],ticks:5,grid:true},y:{label:null,domain:data.map(d=>d.stage)},
       marks:[Plot.ruleX([0]),Plot.barX(data,{x:'days',y:'stage',fill:style.getPropertyValue('--color-accent'),insetTop:22,insetBottom:22}),Plot.text(data,{x:'days',y:'stage',text:d=>`${d.days} days`,dx:8,textAnchor:'start'})]});
     chart.setAttribute('role','img'); chart.setAttribute('aria-label','Illustrative review time: first review eight days, second review five days, final review three days. Synthetic data.');
     host.replaceChildren(chart);
     host.dataset.chartReady='true';
   };
   const observer = new ResizeObserver(draw); observer.observe(host); draw();
   return () => observer.disconnect();
 });
</script>
<figure>
 <figcaption><span class="figure-title">A comparison should be legible at a glance.</span>Example only · three review stages, measured in days</figcaption>
 <div class="chart" bind:this={host}></div>
 <p class="source-note">Synthetic demonstration data. These values describe no client, team, or organization. Labels show the exact value; the axis starts at zero.</p>
 <details><summary>View the underlying example data</summary><table><caption class="sr-only">Synthetic review time</caption><thead><tr><th scope="col">Stage</th><th scope="col">Days</th></tr></thead><tbody>{#each data as row}<tr><th scope="row">{row.stage}</th><td>{row.days}</td></tr>{/each}</tbody></table></details>
 <noscript><p>Example data: first review, 8 days; second review, 5 days; final review, 3 days.</p></noscript>
</figure>
