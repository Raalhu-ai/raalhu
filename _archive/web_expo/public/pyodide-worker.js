/* Pyodide Web Worker — loaded as a classic worker from /pyodide-worker.js */

var pyodide = null;

function progress(step) {
	self.postMessage({ type: 'progress', step: step });
}

async function loadPyodideRuntime() {
	console.log('[Worker] Loading Pyodide from CDN...');
	var t0 = performance.now();
	progress('ރަންޓައިމް ޑައުންލޯޑް ކުރަނީ...');
	importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
	console.log('[Worker] importScripts done, initializing Pyodide...');
	progress('ރަންޓައިމް ތައްޔާރު ކުރަނީ...');
	pyodide = await self.loadPyodide();
	console.log('[Worker] Pyodide loaded, installing micropip...');
	progress('ޕެކޭޖް މެނޭޖަރ އިންސްޓޯލް ކުރަނީ...');
	await pyodide.loadPackage('micropip');
	console.log('[Worker] micropip ready (' + (performance.now() - t0).toFixed(0) + 'ms total)');

	pyodide.runPython(
		'import os\nos.makedirs("/output", exist_ok=True)\nos.makedirs("/workspace", exist_ok=True)\n'
	);
	console.log('[Worker] /output and /workspace directories created');

	progress('ފޮންޓުތައް ލޯޑު ކުރަނީ...');
	try {
		pyodide.FS.mkdir('/fonts');
		var fontNames = ['mvtyper.ttf', 'mvtypebold.ttf', 'SanguSuruhee-Regular.ttf'];
		await Promise.all(fontNames.map(async function(name) {
			var res = await fetch('/fonts/' + name);
			if (res.ok) {
				var buf = await res.arrayBuffer();
				pyodide.FS.writeFile('/fonts/' + name, new Uint8Array(buf));
			}
		}));
		console.log('[Worker] Fonts preloaded to /fonts/');
	} catch (e) {
		console.warn('[Worker] Font preload failed (non-fatal):', e);
	}
}

function reply(id, result, error) {
	self.postMessage({ id: id, result: result, error: error });
}

self.onmessage = async function(e) {
	var msg = e.data;
	var id = msg.id;
	var type = msg.type;
	var payload = msg.payload;
	var t0 = performance.now();
	console.log('[Worker] << ' + type, payload ? JSON.stringify(payload).slice(0, 200) : '');

	try {
		switch (type) {
			case 'init':
				await loadPyodideRuntime();
				console.log('[Worker] >> init OK (' + (performance.now() - t0).toFixed(0) + 'ms)');
				reply(id, { ok: true });
				break;

			case 'execute': {
				var code = payload.code;
				console.log('[Worker] Executing Python (' + code.length + ' chars):\n' + code.slice(0, 300) + (code.length > 300 ? '...' : ''));

				pyodide.runPython(
					'import sys as __sys, io as __io\n' +
					'__stdout_capture = __io.StringIO()\n' +
					'__stderr_capture = __io.StringIO()\n' +
					'__old_stdout = __sys.stdout\n' +
					'__old_stderr = __sys.stderr\n' +
					'__sys.stdout = __stdout_capture\n' +
					'__sys.stderr = __stderr_capture\n'
				);

				var execError = null;
				try {
					await pyodide.runPythonAsync(code);
				} catch (err) {
					execError = err.message || String(err);
				}

				var collectResult = pyodide.runPython(
					'__sys.stdout = __old_stdout\n' +
					'__sys.stderr = __old_stderr\n' +
					'(__stdout_capture.getvalue(), __stderr_capture.getvalue())\n'
				);
				var captured = collectResult.toJs();
				var stdout = captured[0];
				var stderrCaptured = captured[1];
				collectResult.destroy();

				var stderr = execError
					? (stderrCaptured ? stderrCaptured + '\n' + execError : execError)
					: stderrCaptured;

				console.log('[Worker] >> execute (' + (performance.now() - t0).toFixed(0) + 'ms) stdout=' + JSON.stringify(stdout).slice(0, 200) + ' stderr=' + JSON.stringify(stderr).slice(0, 200));
				reply(id, { stdout: stdout, stderr: stderr, result: 'None' });
				break;
			}

			case 'writeFile': {
				var wPath = payload.path;
				var wContent = payload.content;
				console.log('[Worker] Writing file: ' + wPath + ' (' + wContent.length + ' chars)');
				pyodide.runPython(
					'import os\n' +
					'os.makedirs(os.path.dirname(' + JSON.stringify(wPath) + ') or ".", exist_ok=True)\n' +
					'with open(' + JSON.stringify(wPath) + ', "w", encoding="utf-8") as f:\n' +
					'    f.write(' + JSON.stringify(wContent) + ')\n'
				);
				console.log('[Worker] >> writeFile OK (' + (performance.now() - t0).toFixed(0) + 'ms)');
				reply(id, { ok: true });
				break;
			}

			case 'readFile': {
				var rPath = payload.path;
				console.log('[Worker] Reading file: ' + rPath);
				var pyResult = pyodide.runPython(
					'__data = None\n' +
					'with open(' + JSON.stringify(rPath) + ', "r", encoding="utf-8") as f:\n' +
					'    __data = f.read()\n' +
					'__data\n'
				);
				var rContent = typeof pyResult === 'string' ? pyResult : pyResult.toString();
				console.log('[Worker] >> readFile OK (' + (performance.now() - t0).toFixed(0) + 'ms) ' + rContent.length + ' chars');
				reply(id, { content: rContent });
				break;
			}

			case 'listDir': {
				var lPath = payload.path;
				console.log('[Worker] Listing directory: ' + lPath);
				var ldResult = pyodide.runPython(
					'import os\nos.listdir(' + JSON.stringify(lPath) + ')\n'
				);
				var entries = Array.from(ldResult.toJs());
				ldResult.destroy();
				console.log('[Worker] >> listDir OK (' + (performance.now() - t0).toFixed(0) + 'ms) entries:', entries);
				reply(id, { entries: entries });
				break;
			}

			case 'readFileBytes': {
				var bPath = payload.path;
				console.log('[Worker] Reading file bytes: ' + bPath);
				var bResult = pyodide.runPython(
					'__data = None\n' +
					'with open(' + JSON.stringify(bPath) + ', "rb") as f:\n' +
					'    __data = f.read()\n' +
					'__data\n'
				);
				var bytes = new Uint8Array(bResult.toJs());
				bResult.destroy();
				console.log('[Worker] >> readFileBytes OK (' + (performance.now() - t0).toFixed(0) + 'ms) ' + bytes.byteLength + ' bytes');
				reply(id, { bytes: bytes });
				break;
			}

			case 'installPackage': {
				var pkg = payload.pkg;
				console.log('[Worker] Installing package: ' + pkg);
				await pyodide.runPythonAsync(
					'import micropip\nawait micropip.install(' + JSON.stringify(pkg) + ')\n'
				);
				console.log('[Worker] >> installPackage OK (' + (performance.now() - t0).toFixed(0) + 'ms)');
				reply(id, { ok: true });
				break;
			}

			case 'snapshotFS': {
				console.log('[Worker] Snapshotting FS...');
				var snapResult = pyodide.runPython(
					'import os, json, base64\n' +
					'__files = {}\n' +
					'for __root_dir in ["/output", "/workspace"]:\n' +
					'    if os.path.isdir(__root_dir):\n' +
					'        for __dirpath, __dirnames, __filenames in os.walk(__root_dir):\n' +
					'            for __fname in __filenames:\n' +
					'                __full = os.path.join(__dirpath, __fname)\n' +
					'                with open(__full, "rb") as __f:\n' +
					'                    __files[__full] = base64.b64encode(__f.read()).decode("ascii")\n' +
					'json.dumps(__files)\n'
				);
				var filesJsonStr = typeof snapResult === 'string' ? snapResult : snapResult.toString();
				var parsed = JSON.parse(filesJsonStr);
				console.log('[Worker] >> snapshotFS OK (' + (performance.now() - t0).toFixed(0) + 'ms) ' + Object.keys(parsed).length + ' files:', Object.keys(parsed));
				reply(id, { files: parsed });
				break;
			}

			case 'restoreFS': {
				var rFiles = payload.files;
				console.log('[Worker] Restoring FS (' + Object.keys(rFiles).length + ' files):', Object.keys(rFiles));
				var filesJson = JSON.stringify(rFiles);
				pyodide.runPython(
					'import os, json, base64\n' +
					'__files = json.loads(' + JSON.stringify(filesJson) + ')\n' +
					'for __path, __b64data in __files.items():\n' +
					'    os.makedirs(os.path.dirname(__path) or ".", exist_ok=True)\n' +
					'    with open(__path, "wb") as __f:\n' +
					'        __f.write(base64.b64decode(__b64data))\n'
				);
				console.log('[Worker] >> restoreFS OK (' + (performance.now() - t0).toFixed(0) + 'ms)');
				reply(id, { ok: true });
				break;
			}

			default:
				console.warn('[Worker] Unknown message type: ' + type);
				reply(id, undefined, 'Unknown message type: ' + type);
		}
	} catch (err) {
		console.error('[Worker] ERROR in ' + type + ':', err);
		reply(id, undefined, err.message || String(err));
	}
};
