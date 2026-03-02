import { Drawer as DrawerPrimitive } from "vaul-svelte";
import Content from "./drawer-content.svelte";
import Overlay from "./drawer-overlay.svelte";

const Root = DrawerPrimitive.Root;
const Close = DrawerPrimitive.Close;
const Portal = DrawerPrimitive.Portal;
const Title = DrawerPrimitive.Title;
const Description = DrawerPrimitive.Description;

export {
	Root,
	Content,
	Overlay,
	Close,
	Portal,
	Title,
	Description,
	Root as Drawer,
	Content as DrawerContent,
	Overlay as DrawerOverlay,
	Close as DrawerClose,
};
