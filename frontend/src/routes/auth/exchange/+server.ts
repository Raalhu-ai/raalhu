import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const cookie = request.headers.get('cookie') || '';
	const body = await request.text();

	try {
		const res = await fetch(`${BACKEND}/auth/exchange`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: cookie },
			body
		});

		const data = await res.json();
		const headers = new Headers({ 'Content-Type': 'application/json' });

		// Forward Set-Cookie from backend so the session cookie reaches the browser
		const setCookie = res.headers.get('set-cookie');
		if (setCookie) {
			headers.set('Set-Cookie', setCookie);
		}

		return new Response(JSON.stringify(data), { status: res.status, headers });
	} catch {
		return new Response(JSON.stringify({ error: 'Token exchange failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
