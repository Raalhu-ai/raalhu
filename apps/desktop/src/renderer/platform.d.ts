interface DesktopPlatform {
	apiBase: string;
	modelRequests: import('../model-request-types').ModelRequestsAPI;
	byok: import('../byok-types').ByokAPI;
	storage: import("../storage/types").StorageAPI;
	backupStorage: () => Promise<boolean>;
	onStorageFlush: (callback: () => Promise<void>) => () => void;
	isDesktop: boolean;
	platform: string;
	openExternal: (url: string) => Promise<void>;
	startOAuthCallback: (state: string) => Promise<boolean>;
	readOAuthCallback: (state: string) => Promise<import("../oauth-callback").OAuthCallbackStatus>;
	stopOAuthCallback: (state: string) => Promise<void>;
	saveFile: (data: string, filename: string) => Promise<boolean>;
	onShortcut: (callback: (action: string) => void) => () => void;
}

declare global {
	interface Window {
		platform?: DesktopPlatform;
	}
}

export {};
