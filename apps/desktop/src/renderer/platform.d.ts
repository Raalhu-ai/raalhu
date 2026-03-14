interface DesktopPlatform {
	isDesktop: boolean;
	platform: string;
	openExternal: (url: string) => Promise<void>;
	saveFile: (data: string, filename: string) => Promise<boolean>;
	onShortcut: (callback: (action: string) => void) => () => void;
}

declare global {
	interface Window {
		platform?: DesktopPlatform;
	}
}

export {};
