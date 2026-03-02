<script lang="ts">
	import { onMount } from 'svelte';
	import { Waves } from 'lucide-svelte';

	let { data } = $props();

	onMount(() => {
		sessionStorage.setItem('mogger_resume_project', data.projectId);
		window.location.replace('/');
	});
</script>

<div class="flex flex-col items-center justify-center h-screen gap-3">
	<Waves class="w-8 h-8 text-primary animate-[subtle-pulse_2s_ease-in-out_infinite]" />
	<p class="thaana text-muted-foreground text-sm">ލޯޑް ވަނީ...</p>
</div>
