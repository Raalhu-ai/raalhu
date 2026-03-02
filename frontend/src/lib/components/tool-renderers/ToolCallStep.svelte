<script lang="ts">
	import {
		Terminal, FilePen, Eye, FolderOpen, FileOutput, BookOpen, MessageCircleQuestion, Wrench,
		Globe, GlobeLock, PenLine, CookingPot
	} from 'lucide-svelte';
	import type { Component } from 'svelte';
	import StepRow from './StepRow.svelte';
	import PythonRenderer from './PythonRenderer.svelte';
	import WriteFileRenderer from './WriteFileRenderer.svelte';
	import ReadFileRenderer from './ReadFileRenderer.svelte';
	import ListDirRenderer from './ListDirRenderer.svelte';
	import WebResultRenderer from './WebResultRenderer.svelte';

	let { name, args, status, result }: {
		name: string;
		args: Record<string, unknown>;
		status: 'running' | 'done' | 'error';
		result?: Record<string, unknown> | string;
	} = $props();

	interface ToolMeta {
		icon: Component;
		displayName: string;
	}

	// Use args.description as label for tools that support it, fallback to static name
	const desc = $derived(args?.description as string | undefined);

	const toolMeta = $derived.by((): ToolMeta => {
		switch (name) {
			case 'execute_python':
				return { icon: Terminal, displayName: desc || 'Python ރަން ކުރުން' };
			case 'write_file':
				return { icon: FilePen, displayName: desc || 'ފައިލް ލިޔުން' };
			case 'read_file':
				return { icon: Eye, displayName: desc || 'ފައިލް ކިޔުން' };
			case 'list_directory':
				return { icon: FolderOpen, displayName: 'ޑިރެކްޓަރީ ލިސްޓް' };
			case 'present_file':
				return { icon: FileOutput, displayName: 'ފައިލް ދެއްކުން' };
			case 'read_skill':
				return { icon: BookOpen, displayName: 'ސްކިލް ކިޔުން' };
			case 'ask_user_input':
				return { icon: MessageCircleQuestion, displayName: 'ސުވާލު ކުރުން' };
			case 'message_compose':
				return { icon: PenLine, displayName: 'މެސެޖް ލިޔުން' };
			case 'recipe_display':
				return { icon: CookingPot, displayName: 'ރެސިޕީ ދެއްކުން' };
			case 'web_search':
				return { icon: Globe, displayName: 'ވެބް ސާޗް' };
			case 'web_fetch':
				return { icon: GlobeLock, displayName: 'ވެބް ފެޗް' };
			default:
				return { icon: Wrench, displayName: name };
		}
	});
</script>

<StepRow
	icon={toolMeta.icon}
	label={toolMeta.displayName}
	shimmer={status === 'running'}
>
	{#if result != null}
		{#if name === 'execute_python'}
			<PythonRenderer {args} {result} {status} />
		{:else if name === 'write_file'}
			<WriteFileRenderer {args} {result} {status} />
		{:else if name === 'read_file'}
			<ReadFileRenderer {args} {result} {status} />
		{:else if name === 'list_directory'}
			<ListDirRenderer {args} {result} {status} />
		{:else if name === 'web_search' || name === 'web_fetch'}
			<WebResultRenderer {result} />
		{:else if name === 'ask_user_input'}
			<!-- No result display for user input -->
		{/if}
	{/if}
</StepRow>
