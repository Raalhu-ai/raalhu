<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';
	import ByokToastHost from '$lib/components/ByokToastHost.svelte';

	let { children } = $props();

	onMount(() => {
		const gaId = env.PUBLIC_GA_ID;
		if (gaId) {
			(window as any).dataLayer = (window as any).dataLayer || [];
			(window as any).gtag = function () {
				(window as any).dataLayer.push(arguments);
			};
			(window as any).gtag('js', new Date());
			(window as any).gtag('config', gaId);

			const s = document.createElement('script');
			s.async = true;
			s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
			document.head.appendChild(s);
		}
	});
</script>

<div class="min-h-screen bg-background text-foreground font-sans text-sm leading-relaxed">
	{@render children()}
</div>
<ByokToastHost />
