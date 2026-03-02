<script lang="ts">
	let {
		children,
		class: className = '',
		duration = 2,
		spread = 2,
		as = 'span'
	}: {
		children: import('svelte').Snippet;
		class?: string;
		duration?: number;
		spread?: number;
		as?: string;
	} = $props();
</script>

<svelte:element
	this={as}
	class="text-shimmer {className}"
	style="--shimmer-duration: {duration}s; --shimmer-spread: {spread}em;"
>
	{@render children()}
</svelte:element>

<style>
	.text-shimmer {
		display: inline-block;
		background-size: 250% 100%;
		background-clip: text;
		-webkit-background-clip: text;
		color: transparent;
		background-repeat: no-repeat, padding-box;
		--base-color: var(--muted-foreground);
		--shimmer-color: var(--foreground);
		background-image:
			linear-gradient(
				270deg,
				transparent calc(50% - var(--shimmer-spread)),
				var(--shimmer-color),
				transparent calc(50% + var(--shimmer-spread))
			),
			linear-gradient(var(--base-color), var(--base-color));
		animation: shimmer-rtl var(--shimmer-duration) linear infinite;
	}

	@keyframes shimmer-rtl {
		0% {
			background-position: 0% center;
		}
		100% {
			background-position: 100% center;
		}
	}
</style>
