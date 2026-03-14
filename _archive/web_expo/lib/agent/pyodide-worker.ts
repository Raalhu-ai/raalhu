const _self = self as unknown as DedicatedWorkerGlobalScope;

let pyodide: any = null;

interface WorkerMessage {
	id: string;
	type: string;
	payload?: any;
}

function progress(step: string) {
	_self.postMessage({ type: 'progress', step });
}

async function loadPyodideRuntime() {
	console.log('[Worker] Loading Pyodide from CDN...');
	const t0 = performance.now();
	progress('ރަންޓައިމް ޑައުންލޯޑް ކުރަނީ...');
	importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
	console.log('[Worker] importScripts done, initializing Pyodide...');
	progress('ރަންޓައިމް ތައްޔާރު ކުރަނީ...');
	pyodide = await (_self as any).loadPyodide();
	console.log('[Worker] Pyodide loaded, installing micropip...');
	progress('ޕެކޭޖް މެނޭޖަރ އިންސްޓޯލް ކުރަނީ...');
	await pyodide.loadPackage('micropip');
	console.log(`[Worker] micropip ready (${(performance.now() - t0).toFixed(0)}ms total)`);

	// Create working directories
	pyodide.runPython(`
import os
os.makedirs('/output', exist_ok=True)
os.makedirs('/workspace', exist_ok=True)
`);
	console.log('[Worker] /output and /workspace directories created');

	// Preload Thaana fonts into /fonts/ (outside /workspace/ to avoid snapshot bloat)
	progress('ފޮންޓުތައް ލޯޑު ކުރަނީ...');
	try {
		pyodide.FS.mkdir('/fonts');
		const fontNames = ['mvtyper.ttf', 'mvtypebold.ttf', 'SanguSuruhee-Regular.ttf'];
		await Promise.all(fontNames.map(async (name: string) => {
			const res = await fetch(`/fonts/${name}`);
			if (res.ok) {
				const buf = await res.arrayBuffer();
				pyodide.FS.writeFile(`/fonts/${name}`, new Uint8Array(buf));
			}
		}));
		console.log('[Worker] Fonts preloaded to /fonts/');
	} catch (e) {
		console.warn('[Worker] Font preload failed (non-fatal):', e);
	}
}

function reply(id: string, result?: any, error?: string) {
	_self.postMessage({ id, result, error });
}

_self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
	const { id, type, payload } = e.data;
	const t0 = performance.now();
	console.log(`[Worker] << ${type}`, payload ? JSON.stringify(payload).slice(0, 200) : '');

	try {
		switch (type) {
			case 'init': {
				await loadPyodideRuntime();
				console.log(`[Worker] >> init OK (${(performance.now() - t0).toFixed(0)}ms)`);
				reply(id, { ok: true });
				break;
			}

			case 'execute': {
				const code: string = payload.code;
				console.log(`[Worker] Executing Python (${code.length} chars):\n${code.slice(0, 300)}${code.length > 300 ? '...' : ''}`);

				// 1. Redirect stdout/stderr before running user code
				pyodide.runPython(`
import sys as __sys, io as __io
__stdout_capture = __io.StringIO()
__stderr_capture = __io.StringIO()
__old_stdout = __sys.stdout
__old_stderr = __sys.stderr
__sys.stdout = __stdout_capture
__sys.stderr = __stderr_capture
`);

				// 2. Run user code directly with runPythonAsync (supports top-level await)
				//    NOT wrapped in exec() — exec() is synchronous and breaks await
				let execError: string | null = null;
				try {
					await pyodide.runPythonAsync(code);
				} catch (err: any) {
					execError = err.message || String(err);
				}

				// 3. Restore stdout/stderr and collect captured output
				const collectResult = pyodide.runPython(`
__sys.stdout = __old_stdout
__sys.stderr = __old_stderr
(__stdout_capture.getvalue(), __stderr_capture.getvalue())
`);
				const [stdout, stderrCaptured] = collectResult.toJs();
				collectResult.destroy();

				// Combine captured stderr with any Python exception traceback
				const stderr = execError
					? (stderrCaptured ? stderrCaptured + '\n' + execError : execError)
					: stderrCaptured;

				console.log(`[Worker] >> execute (${(performance.now() - t0).toFixed(0)}ms) stdout=${JSON.stringify(stdout).slice(0, 200)} stderr=${JSON.stringify(stderr).slice(0, 200)}`);
				reply(id, { stdout, stderr, result: 'None' });
				break;
			}

			case 'writeFile': {
				const { path, content } = payload;
				console.log(`[Worker] Writing file: ${path} (${content.length} chars)`);
				pyodide.runPython(`
import os
os.makedirs(os.path.dirname(${JSON.stringify(path)}) or '.', exist_ok=True)
with open(${JSON.stringify(path)}, 'w', encoding='utf-8') as f:
    f.write(${JSON.stringify(content)})
`);
				console.log(`[Worker] >> writeFile OK (${(performance.now() - t0).toFixed(0)}ms)`);
				reply(id, { ok: true });
				break;
			}

			case 'readFile': {
				const { path } = payload;
				console.log(`[Worker] Reading file: ${path}`);
				const pyResult = pyodide.runPython(`
__data = None
with open(${JSON.stringify(path)}, 'r', encoding='utf-8') as f:
    __data = f.read()
__data
`);
				const content = typeof pyResult === 'string' ? pyResult : pyResult.toString();
				console.log(`[Worker] >> readFile OK (${(performance.now() - t0).toFixed(0)}ms) ${content.length} chars`);
				reply(id, { content });
				break;
			}

			case 'listDir': {
				const { path } = payload;
				console.log(`[Worker] Listing directory: ${path}`);
				const pyResult = pyodide.runPython(`
import os
os.listdir(${JSON.stringify(path)})
`);
				const entries = Array.from(pyResult.toJs());
				pyResult.destroy();
				console.log(`[Worker] >> listDir OK (${(performance.now() - t0).toFixed(0)}ms) entries:`, entries);
				reply(id, { entries });
				break;
			}

			case 'readFileBytes': {
				const { path } = payload;
				console.log(`[Worker] Reading file bytes: ${path}`);
				const pyResult = pyodide.runPython(`
__data = None
with open(${JSON.stringify(path)}, 'rb') as f:
    __data = f.read()
__data
`);
				const bytes = new Uint8Array(pyResult.toJs());
				pyResult.destroy();
				console.log(`[Worker] >> readFileBytes OK (${(performance.now() - t0).toFixed(0)}ms) ${bytes.byteLength} bytes`);
				reply(id, { bytes });
				break;
			}

			case 'installPackage': {
				const { pkg } = payload;
				console.log(`[Worker] Installing package: ${pkg}`);
				await pyodide.runPythonAsync(`
import micropip
await micropip.install(${JSON.stringify(pkg)})
`);
				console.log(`[Worker] >> installPackage OK (${(performance.now() - t0).toFixed(0)}ms)`);
				reply(id, { ok: true });
				break;
			}

			case 'snapshotFS': {
				console.log('[Worker] Snapshotting FS...');
				const pyResult = pyodide.runPython(`
import os, json, base64
__files = {}
for __root_dir in ['/output', '/workspace']:
    if os.path.isdir(__root_dir):
        for __dirpath, __dirnames, __filenames in os.walk(__root_dir):
            for __fname in __filenames:
                __full = os.path.join(__dirpath, __fname)
                with open(__full, 'rb') as __f:
                    __files[__full] = base64.b64encode(__f.read()).decode('ascii')
json.dumps(__files)
`);
				const filesJsonStr = typeof pyResult === 'string' ? pyResult : pyResult.toString();
				const parsed: Record<string, string> = JSON.parse(filesJsonStr);
				console.log(`[Worker] >> snapshotFS OK (${(performance.now() - t0).toFixed(0)}ms) ${Object.keys(parsed).length} files:`, Object.keys(parsed));
				reply(id, { files: parsed });
				break;
			}

			case 'restoreFS': {
				const { files } = payload as { files: Record<string, string> };
				console.log(`[Worker] Restoring FS (${Object.keys(files).length} files):`, Object.keys(files));
				const filesJson = JSON.stringify(files);
				pyodide.runPython(`
import os, json, base64
__files = json.loads(${JSON.stringify(filesJson)})
for __path, __b64data in __files.items():
    os.makedirs(os.path.dirname(__path) or '.', exist_ok=True)
    with open(__path, 'wb') as __f:
        __f.write(base64.b64decode(__b64data))
`);
				console.log(`[Worker] >> restoreFS OK (${(performance.now() - t0).toFixed(0)}ms)`);
				reply(id, { ok: true });
				break;
			}

			default:
				console.warn(`[Worker] Unknown message type: ${type}`);
				reply(id, undefined, `Unknown message type: ${type}`);
		}
	} catch (err: any) {
		console.error(`[Worker] ERROR in ${type}:`, err);
		reply(id, undefined, err?.message || String(err));
	}
};
