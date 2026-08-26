import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const cookie = request.headers.get('cookie') || '';

	try {
		const res = await fetch(`${BACKEND}/api/quota`, {
			headers: { Cookie: cookie }
		});

		const data = await res.json();
		const headers = new Headers({ 'Content-Type': 'application/json' });
		const setCookie = res.headers.get('set-cookie');
		if (setCookie) headers.set('Set-Cookie', setCookie);
		return new Response(JSON.stringify(data), {
			status: res.status,
			headers
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Quota fetch failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
