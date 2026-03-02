<script lang="ts">
	import { Dialog as DialogPrimitive } from "bits-ui";
	import DialogPortal from "../dialog/dialog-portal.svelte";
	import * as Dialog from "../dialog/index.js";
	import XIcon from "@lucide/svelte/icons/x";
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: DialogPrimitive.ContentProps & {
		children: Snippet;
	} = $props();
</script>

<DialogPortal>
	<Dialog.Overlay />
	<DialogPrimitive.Content
		bind:ref
		data-slot="sheet-content"
		class={cn(
			"fixed inset-y-0 right-0 z-50 w-[280px] bg-card border-l border-border p-0 shadow-xl flex flex-col",
			"data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out",
			"duration-300 ease-out",
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</DialogPrimitive.Content>
</DialogPortal>
