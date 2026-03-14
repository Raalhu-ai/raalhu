/**
 * Promise-based wrapper around the Pyodide WebView bridge.
 * Same public API as apps/web/lib/agent/sandbox.ts but uses
 * setSendMessage/handleMessage instead of Worker postMessage.
 */

type PendingRequest = {
	resolve: (value: any) => void;
	reject: (reason: any) => void;
};

export class PyodideSandbox {
	private pending = new Map<string, PendingRequest>();
	private initPromise: Promise<void> | null = null;
	private _ready = false;
	private _onProgress: ((step: string) => void) | null = null;
	private _sendMessage: ((msg: string) => void) | null = null;
	private _msgId = 0;

	get ready(): boolean {
		return this._ready;
	}

	set onProgress(cb: ((step: string) => void) | null) {
		this._onProgress = cb;
	}

	/** Called by the provider to wire up the WebView transport */
	setSendMessage(fn: (msg: string) => void): void {
		this._sendMessage = fn;
	}

	/** Called by the provider when a message arrives from the WebView */
	handleMessage(dataStr: string): void {
		let data: any;
		try {
			data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
		} catch {
			return;
		}

		if (data.type === 'progress') {
			this._onProgress?.(data.step);
			return;
		}

		if (data.type === 'ready') {
			return;
		}

		const { id, result, error } = data;
		const pending = this.pending.get(id);
		if (!pending) return;
		this.pending.delete(id);
		if (error) {
			pending.reject(new Error(error));
		} else {
			pending.resolve(result);
		}
	}

	async init(): Promise<void> {
		if (this._ready) return;
		if (this.initPromise) return this.initPromise;
		this.initPromise = this._init();
		return this.initPromise;
	}

	private async _init(): Promise<void> {
		await this.send('init');
		this._ready = true;
	}

	private send(type: string, payload?: any): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this._sendMessage) {
				reject(new Error('WebView not connected'));
				return;
			}
			const id = String(++this._msgId);
			this.pending.set(id, { resolve, reject });
			this._sendMessage(JSON.stringify({ id, type, payload }));
		});
	}

	private async ensureReady(): Promise<void> {
		if (!this._ready) await this.init();
	}

	async execute(code: string): Promise<{ stdout: string; stderr: string; result: string }> {
		await this.ensureReady();
		return await this.send('execute', { code });
	}

	async writeFile(path: string, content: string): Promise<void> {
		await this.ensureReady();
		await this.send('writeFile', { path, content });
	}

	async readFile(path: string): Promise<string> {
		await this.ensureReady();
		const { content } = await this.send('readFile', { path });
		return content;
	}

	async listDir(path: string): Promise<string[]> {
		await this.ensureReady();
		const { entries } = await this.send('listDir', { path });
		return entries;
	}

	async readFileBytes(path: string): Promise<Uint8Array> {
		await this.ensureReady();
		const { base64 } = await this.send('readFileBytes', { path });
		// Decode base64 to Uint8Array
		const binaryStr = atob(base64);
		const bytes = new Uint8Array(binaryStr.length);
		for (let i = 0; i < binaryStr.length; i++) {
			bytes[i] = binaryStr.charCodeAt(i);
		}
		return bytes;
	}

	/** Returns file bytes as a base64 string (avoids decode/re-encode round-trip on mobile) */
	async readFileBytesBase64(path: string): Promise<string> {
		await this.ensureReady();
		const { base64 } = await this.send('readFileBytes', { path });
		return base64;
	}

	async installPackage(pkg: string): Promise<void> {
		await this.ensureReady();
		await this.send('installPackage', { pkg });
	}

	async snapshotFS(): Promise<Record<string, string>> {
		await this.ensureReady();
		const { files } = await this.send('snapshotFS');
		return files;
	}

	async restoreFS(files: Record<string, string>): Promise<void> {
		await this.ensureReady();
		await this.send('restoreFS', { files });
	}

	destroy(): void {
		this._ready = false;
		this._sendMessage = null;
		this.pending.forEach((p) => p.reject(new Error('Sandbox destroyed')));
		this.pending.clear();
	}
}
