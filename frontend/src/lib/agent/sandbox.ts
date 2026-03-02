/**
 * Promise-based wrapper around the Pyodide WebWorker.
 */

type PendingRequest = {
	resolve: (value: any) => void;
	reject: (reason: any) => void;
};

export class PyodideSandbox {
	private worker: Worker | null = null;
	private pending = new Map<string, PendingRequest>();
	private initPromise: Promise<void> | null = null;
	private _ready = false;
	private _onProgress: ((step: string) => void) | null = null;

	get ready(): boolean {
		return this._ready;
	}

	set onProgress(cb: ((step: string) => void) | null) {
		this._onProgress = cb;
	}

	/**
	 * Initialize Pyodide runtime. Lazy — only loads on first call.
	 */
	async init(): Promise<void> {
		if (this._ready) {
			console.log('[Sandbox] Already initialized');
			return;
		}
		if (this.initPromise) {
			console.log('[Sandbox] Init already in progress, waiting...');
			return this.initPromise;
		}

		console.log('[Sandbox] Starting initialization...');
		this.initPromise = this._init();
		return this.initPromise;
	}

	private async _init(): Promise<void> {
		const t0 = performance.now();
		this.worker = new Worker(
			new URL('./pyodide-worker.ts', import.meta.url),
			{ type: 'classic' }
		);

		this.worker.onmessage = (e: MessageEvent) => {
			const data = e.data;
			if (data.type === 'progress') {
				this._onProgress?.(data.step);
				return;
			}
			const { id, result, error } = data;
			const pending = this.pending.get(id);
			if (!pending) {
				console.warn('[Sandbox] Received message for unknown id:', id);
				return;
			}
			this.pending.delete(id);
			if (error) {
				pending.reject(new Error(error));
			} else {
				pending.resolve(result);
			}
		};

		this.worker.onerror = (e) => {
			console.error('[Sandbox] Worker error:', e);
		};

		await this.send('init');
		this._ready = true;
		console.log(`[Sandbox] Initialized (${(performance.now() - t0).toFixed(0)}ms)`);
	}

	private send(type: string, payload?: any): Promise<any> {
		return new Promise((resolve, reject) => {
			if (!this.worker) {
				reject(new Error('Worker not initialized'));
				return;
			}
			const id = crypto.randomUUID();
			this.pending.set(id, { resolve, reject });
			this.worker.postMessage({ id, type, payload });
		});
	}

	private async ensureReady(): Promise<void> {
		if (!this._ready) await this.init();
	}

	async execute(code: string): Promise<{ stdout: string; stderr: string; result: string }> {
		console.log(`[Sandbox] execute (${code.length} chars)`);
		await this.ensureReady();
		const t0 = performance.now();
		const result = await this.send('execute', { code });
		console.log(`[Sandbox] execute done (${(performance.now() - t0).toFixed(0)}ms)`, {
			stdout: result.stdout?.slice(0, 150),
			stderr: result.stderr?.slice(0, 150),
			result: result.result?.slice(0, 100)
		});
		return result;
	}

	async writeFile(path: string, content: string): Promise<void> {
		console.log(`[Sandbox] writeFile: ${path} (${content.length} chars)`);
		await this.ensureReady();
		await this.send('writeFile', { path, content });
		console.log(`[Sandbox] writeFile done: ${path}`);
	}

	async readFile(path: string): Promise<string> {
		console.log(`[Sandbox] readFile: ${path}`);
		await this.ensureReady();
		const { content } = await this.send('readFile', { path });
		console.log(`[Sandbox] readFile done: ${path} (${content.length} chars)`);
		return content;
	}

	async listDir(path: string): Promise<string[]> {
		console.log(`[Sandbox] listDir: ${path}`);
		await this.ensureReady();
		const { entries } = await this.send('listDir', { path });
		console.log(`[Sandbox] listDir done: ${path}`, entries);
		return entries;
	}

	async readFileBytes(path: string): Promise<Uint8Array> {
		console.log(`[Sandbox] readFileBytes: ${path}`);
		await this.ensureReady();
		const { bytes } = await this.send('readFileBytes', { path });
		console.log(`[Sandbox] readFileBytes done: ${path} (${bytes.byteLength} bytes)`);
		return bytes;
	}

	async installPackage(pkg: string): Promise<void> {
		console.log(`[Sandbox] installPackage: ${pkg}`);
		await this.ensureReady();
		const t0 = performance.now();
		await this.send('installPackage', { pkg });
		console.log(`[Sandbox] installPackage done: ${pkg} (${(performance.now() - t0).toFixed(0)}ms)`);
	}

	/**
	 * Snapshot the virtual FS (/output + /workspace).
	 * Returns a map of path → base64-encoded content.
	 */
	async snapshotFS(): Promise<Record<string, string>> {
		console.log('[Sandbox] snapshotFS');
		await this.ensureReady();
		const { files } = await this.send('snapshotFS');
		console.log(`[Sandbox] snapshotFS done: ${Object.keys(files).length} files`);
		return files;
	}

	/**
	 * Restore the virtual FS from a snapshot.
	 */
	async restoreFS(files: Record<string, string>): Promise<void> {
		console.log(`[Sandbox] restoreFS: ${Object.keys(files).length} files`);
		await this.ensureReady();
		await this.send('restoreFS', { files });
		console.log('[Sandbox] restoreFS done');
	}

	destroy(): void {
		console.log('[Sandbox] Destroying worker');
		this.worker?.terminate();
		this.worker = null;
		this._ready = false;
		this.pending.clear();
	}
}
