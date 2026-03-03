import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const cookie = request.headers.get('cookie') || '';

	try {
		const res = await fetch(`${BACKEND}/api/quota`, {
			headers: { Cookie: cookie }
		});

		const data = await res.json();
		return new Response(JSON.stringify(data), {
			status: res.status,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Quota fetch failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
