# Google AI Studio BYOK settings

Desktop keeps the API key in `google-byok-key.enc` under Electron's userData directory, encrypted with `safeStorage`. Saving requires OS-backed storage; Linux's `basic_text` fallback is rejected. The renderer can save/remove a key, read its status, test it, or set a route preference through `window.platform.byok`. It cannot read the saved key or choose the validation request destination.

SQLite's `meta` table stores `byok-settings`: preferred route, validation status, last test timestamp, a sanitized error, and a digest of the encrypted credential file. No plaintext key is stored in SQLite or localStorage. Saving/replacing/removing a key resets validation and selects the proxy. Restoring SQLite without the matching credential file also resets this metadata. Conversation backups include this metadata but not the credential file.

Key validation is implemented at `POST /api/byok-test` in the Hono backend. SvelteKit's identically named endpoint forwards to it using `BACKEND_URL`. Electron sends the saved key from the main process to the backend configured by the `RAALHU_API_BASE` environment variable (default `http://127.0.0.1:3000`). Non-local backend URLs must use HTTPS; redirects are rejected. Validation uses the supplied Google key and does not require Antigravity project setup.

The backend makes a small generation request to Google. Explicit key rejection marks it invalid; network, quota and access failures leave prior validation intact and record an error. Provider response text is not persisted by desktop. Tests and mutations are serialized so a result cannot be applied to a replacement key.

Chat and title generation use `fetchModelRequest`, backed by narrow main-process `start/read/cancel` operations. Only `/api/stream` and `/api/generate` are allowed. The main process preserves the session header, attaches the saved Google key only when BYOK is selected, and streams response chunks back on demand. Keys never return through the preload API. Cancellation, navigation and window destruction release network requests. Quota, setup and tool API calls use their existing paths without BYOK credentials.

Settings lets users select Antigravity proxy or Google AI Studio after testing a saved key. The preference is checked for each new model request, including tool continuation requests. Selecting proxy does not remove the key. Title generation uses the same Gemini 2.5 Flash model as the frontend title endpoint.

Chat streaming handles SSE error events even without candidates. If BYOK fails before emitting text, reasoning, or a tool call, that model turn can retry once through the proxy with the identical body and session. The main process verifies `/auth/me` has a project and is not an enterprise/PayGo account before sending the fallback generation request, with no BYOK headers. Once any output has been emitted, the error is surfaced and the turn is not replayed. Cancellation, authentication errors and model safety blocks do not trigger fallback. Proxy failures cannot trigger another fallback. A chat notice identifies a fallback that started successfully; saved route preferences and key validation remain unchanged.

`RAALHU_API_BASE` is supplied by the main process to the renderer so session authentication, validation, and model requests share a backend. Deploy the updated Hono backend before publishing the frontend validation-forwarding change or using desktop validation against a hosted backend.

Startup and login require a valid Raalhu session. With a saved, validated and available BYOK key selected, users enter immediately while Antigravity provisioning runs in the background. Provisioning failures do not block BYOK. Proxy mode still requires a provisioned project; the setup screen offers access to BYOK Settings. Provider changes in Settings update the app immediately.

BYOK uses its own catalog of the app's public Gemini IDs (`gemini-3-flash-preview`, `gemini-2.5-flash`, `gemini-2.5-pro`), independent of proxy quota discovery. This is a maintained catalog, not a live list of every model accessible to a particular Google project. Restored proxy-only aliases are replaced before sending a BYOK chat. Proxy quota requests and percentages/countdowns are suppressed in BYOK mode; the sidebar explicitly states that AI Studio quota is not displayed. Switching back to a ready proxy refreshes its quota.

Checks:

- `bun test server/test/byok-test.test.ts frontend/test/byok.test.ts` from the repository root.
- `bun test test/byok.test.ts` from `apps/desktop` (mocked Electron credential service).
- `bun run build` and `bun run test:storage` from `apps/desktop` (real Electron SQLite driver).

Failure classification: validation metadata includes `lastFailureKind` (credentials, quota,
network, model-access, cancelled, or unknown). Only explicit provider credential rejection
invalidates the key. Temporary failures keep its previous validation status. The backend
sends the same categories for HTTP and SSE model failures; desktop displays local,
category-specific guidance and never falls back on cancellation. Frontend request failures
also preserve valid keys unless credentials were explicitly rejected, and stream fallback
selects proxy for that request without rewriting the preferred route.

BYOK history conversion preserves structured SDK tool-call and tool-result messages.
Results retain their JSON values (including error objects). Explicit call IDs are retained;
legacy ID-less histories are paired by tool name in call order, with unique generated IDs.
Both generation endpoints use this conversion, with outgoing Google payload regression tests.
