// Configure the installed-app identity via ANTIGRAVITY_OAUTH_CLIENT_ID and
// ANTIGRAVITY_OAUTH_CLIENT_SECRET Worker secrets. Keep authorize, exchange and refresh aligned.
// Source: router-for-me/CLIProxyAPI internal/auth/antigravity/constants.go
export const ANTIGRAVITY_REDIRECT_URI = "http://localhost:51121/oauth-callback";

/** Validate the manually transferred redirect before consuming its one-time login state. */
export function parseAntigravityCallback(input: unknown, state: string, redirectUri: string): string {
	if (typeof input !== "string") throw new Error("Paste the complete Google callback URL.");
	let url: URL;
	try { url = new URL(input.trim()); } catch { throw new Error("Paste the complete callback URL from the browser address bar."); }
	const expected = new URL(redirectUri);
	if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.username || url.password || url.hash) {
		throw new Error("This is not the expected Google callback URL.");
	}
	if (url.searchParams.getAll("state").length !== 1 || url.searchParams.get("state") !== state) {
		throw new Error("This callback belongs to a different sign-in. Please start again.");
	}
	if (url.searchParams.has("error")) throw new Error("Google sign-in was not completed. Please start again.");
	const code = url.searchParams.get("code");
	if (!code || url.searchParams.getAll("code").length !== 1) throw new Error("The callback URL does not contain a valid authorization code.");
	return code;
}
