/**
 * HTML string loaded into a hidden WebView to run Pyodide.
 * Port of apps/web/lib/agent/pyodide-worker.ts adapted for WebView context:
 * - postMessage → window.ReactNativeWebView.postMessage()
 * - onmessage → global handleRNMessage() called via injectJavaScript
 * - readFileBytes base64-encodes Uint8Array (can't transfer binary over RN bridge)
 */
export const PYODIDE_BRIDGE_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body>
<script src="https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js"></script>
<script>
var pyodide = null;

function post(msg) {
  window.ReactNativeWebView.postMessage(JSON.stringify(msg));
}

function progress(step) {
  post({ type: 'progress', step: step });
}

function reply(id, result, error) {
  post({ id: id, result: result, error: error });
}

async function loadPyodideRuntime() {
  progress('\\u0783\\u07a6\\u0782\\u07b0\\u0793\\u07a6\\u0787\\u07a8\\u0789\\u07b0 \\u0791\\u07a6\\u0787\\u07aa\\u0782\\u07b0\\u078d\\u07af\\u0791\\u07b0 \\u0786\\u07aa\\u0783\\u07a6\\u0782\\u07a9...');
  pyodide = await loadPyodide();
  progress('\\u0783\\u07a6\\u0782\\u07b0\\u0793\\u07a6\\u0787\\u07a8\\u0789\\u07b0 \\u078c\\u07a6\\u0787\\u07b0\\u0794\\u07a7\\u0783\\u07aa \\u0786\\u07aa\\u0783\\u07a6\\u0782\\u07a9...');
  await pyodide.loadPackage('micropip');
  progress('\\u0795\\u07ac\\u0786\\u07ac\\u0796\\u07b0 \\u0789\\u07ac\\u0782\\u07ac\\u0796\\u07a6\\u0783\\u07b0 \\u0787\\u07a8\\u0782\\u07b0\\u0790\\u07b0\\u0793\\u07af\\u078d\\u07b0 \\u0786\\u07aa\\u0783\\u07a6\\u0782\\u07a9...');
  pyodide.runPython('import os\\nos.makedirs("/output", exist_ok=True)\\nos.makedirs("/workspace", exist_ok=True)');
}

async function handleMessage(msg) {
  var id = msg.id;
  var type = msg.type;
  var payload = msg.payload;

  try {
    switch (type) {
      case 'init': {
        await loadPyodideRuntime();
        reply(id, { ok: true });
        break;
      }

      case 'execute': {
        var code = payload.code;
        pyodide.runPython(
          'import sys as __sys, io as __io\\n' +
          '__stdout_capture = __io.StringIO()\\n' +
          '__stderr_capture = __io.StringIO()\\n' +
          '__old_stdout = __sys.stdout\\n' +
          '__old_stderr = __sys.stderr\\n' +
          '__sys.stdout = __stdout_capture\\n' +
          '__sys.stderr = __stderr_capture'
        );

        var execError = null;
        try {
          await pyodide.runPythonAsync(code);
        } catch (err) {
          execError = err.message || String(err);
        }

        var collectResult = pyodide.runPython(
          '__sys.stdout = __old_stdout\\n' +
          '__sys.stderr = __old_stderr\\n' +
          '(__stdout_capture.getvalue(), __stderr_capture.getvalue())'
        );
        var pair = collectResult.toJs();
        var stdout = pair[0];
        var stderrCaptured = pair[1];
        collectResult.destroy();

        var stderr = execError
          ? (stderrCaptured ? stderrCaptured + '\\n' + execError : execError)
          : stderrCaptured;

        reply(id, { stdout: stdout, stderr: stderr, result: 'None' });
        break;
      }

      case 'writeFile': {
        var path = payload.path;
        var content = payload.content;
        pyodide.runPython(
          'import os\\n' +
          'os.makedirs(os.path.dirname(' + JSON.stringify(path) + ') or ".", exist_ok=True)\\n' +
          'with open(' + JSON.stringify(path) + ', "w", encoding="utf-8") as f:\\n' +
          '    f.write(' + JSON.stringify(content) + ')'
        );
        reply(id, { ok: true });
        break;
      }

      case 'readFile': {
        var path = payload.path;
        var pyResult = pyodide.runPython(
          '__data = None\\n' +
          'with open(' + JSON.stringify(path) + ', "r", encoding="utf-8") as f:\\n' +
          '    __data = f.read()\\n' +
          '__data'
        );
        var content = typeof pyResult === 'string' ? pyResult : pyResult.toString();
        reply(id, { content: content });
        break;
      }

      case 'listDir': {
        var path = payload.path;
        var pyResult = pyodide.runPython('import os\\nos.listdir(' + JSON.stringify(path) + ')');
        var entries = Array.from(pyResult.toJs());
        pyResult.destroy();
        reply(id, { entries: entries });
        break;
      }

      case 'readFileBytes': {
        var path = payload.path;
        var pyResult = pyodide.runPython(
          'import base64\\n' +
          '__data = None\\n' +
          'with open(' + JSON.stringify(path) + ', "rb") as f:\\n' +
          '    __data = base64.b64encode(f.read()).decode("ascii")\\n' +
          '__data'
        );
        var b64 = typeof pyResult === 'string' ? pyResult : pyResult.toString();
        reply(id, { base64: b64 });
        break;
      }

      case 'installPackage': {
        var pkg = payload.pkg;
        await pyodide.runPythonAsync('import micropip\\nawait micropip.install(' + JSON.stringify(pkg) + ')');
        reply(id, { ok: true });
        break;
      }

      case 'snapshotFS': {
        var pyResult = pyodide.runPython(
          'import os, json, base64\\n' +
          '__files = {}\\n' +
          'for __root_dir in ["/output", "/workspace"]:\\n' +
          '    if os.path.isdir(__root_dir):\\n' +
          '        for __dirpath, __dirnames, __filenames in os.walk(__root_dir):\\n' +
          '            for __fname in __filenames:\\n' +
          '                __full = os.path.join(__dirpath, __fname)\\n' +
          '                with open(__full, "rb") as __f:\\n' +
          '                    __files[__full] = base64.b64encode(__f.read()).decode("ascii")\\n' +
          'json.dumps(__files)'
        );
        var filesJsonStr = typeof pyResult === 'string' ? pyResult : pyResult.toString();
        var parsed = JSON.parse(filesJsonStr);
        reply(id, { files: parsed });
        break;
      }

      case 'restoreFS': {
        var files = payload.files;
        var filesJson = JSON.stringify(files);
        pyodide.runPython(
          'import os, json, base64\\n' +
          '__files = json.loads(' + JSON.stringify(filesJson) + ')\\n' +
          'for __path, __b64data in __files.items():\\n' +
          '    os.makedirs(os.path.dirname(__path) or ".", exist_ok=True)\\n' +
          '    with open(__path, "wb") as __f:\\n' +
          '        __f.write(base64.b64decode(__b64data))'
        );
        reply(id, { ok: true });
        break;
      }

      default:
        reply(id, undefined, 'Unknown message type: ' + type);
    }
  } catch (err) {
    reply(id, undefined, err.message || String(err));
  }
}

// Expose for injectJavaScript
window.handleRNMessage = function(msgStr) {
  try {
    handleMessage(JSON.parse(msgStr));
  } catch (e) {
    // ignore parse errors
  }
};

// Also listen for postMessage from RN (iOS uses window, Android uses document)
window.addEventListener('message', function(e) {
  try {
    var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    handleMessage(msg);
  } catch (ex) {}
});
document.addEventListener('message', function(e) {
  try {
    var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
    handleMessage(msg);
  } catch (ex) {}
});

// Signal ready
post({ type: 'ready' });
</script>
</body></html>`;
