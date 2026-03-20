<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { env } from '$env/dynamic/public';

	let { children } = $props();

	onMount(() => {
		const gaId = env.PUBLIC_GA_ID;
		if (gaId) {
			const s = document.createElement('script');
			s.async = true;
			s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
			document.head.appendChild(s);
			(window as any).dataLayer = (window as any).dataLayer || [];
			function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
			gtag('js', new Date());
			gtag('config', gaId);
		}
	});
</script>

<div class="min-h-screen bg-background text-foreground font-sans text-sm leading-relaxed">
	{@render children()}
</div>
