<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="min-h-screen bg-background text-foreground font-sans text-sm leading-relaxed">
	{@render children()}
</div>
