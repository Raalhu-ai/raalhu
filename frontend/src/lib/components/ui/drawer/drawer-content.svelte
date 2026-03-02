<script lang="ts">
	import { Drawer as DrawerPrimitive } from "vaul-svelte";
	import Overlay from "./drawer-overlay.svelte";
	import type { Snippet } from "svelte";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: DrawerPrimitive.ContentProps & {
		children: Snippet;
	} = $props();
</script>

<DrawerPrimitive.Portal>
	<Overlay />
	<DrawerPrimitive.Content
		bind:ref
		class={cn(
			"fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-background border-t border-border",
			className
		)}
		{...restProps}
	>
		<div class="mx-auto mt-3 mb-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30"></div>
		{@render children?.()}
	</DrawerPrimitive.Content>
</DrawerPrimitive.Portal>
