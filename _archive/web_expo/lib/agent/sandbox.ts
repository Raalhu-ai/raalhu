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

	async init(): Promise<void> {
		if (this._ready) return;
		if (this.initPromise) return this.initPromise;
		this.initPromise = this._init();
		return this.initPromise;
	}

	private async _init(): Promise<void> {
		// Metro doesn't support import.meta, so we load the worker via a
		// hosted script path instead. The worker file must be placed in
		// public/pyodide-worker.js (copied at build time or served statically).
		this.worker = new Worker('/pyodide-worker.js');

		this.worker.onmessage = (e: MessageEvent) => {
			const data = e.data;
			if (data.type === 'progress') {
				this._onProgress?.(data.step);
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
		};

		this.worker.onerror = (e) => {
			console.error('[Sandbox] Worker error:', e);
		};

		await this.send('init');
		this._ready = true;
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
		const { bytes } = await this.send('readFileBytes', { path });
		return bytes;
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
		this.worker?.terminate();
		this.worker = null;
		this._ready = false;
		this.pending.clear();
	}
}
