import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const { message } = await request.json();
	if (!message) {
		return new Response(JSON.stringify({ title: '' }), {
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const cookie = request.headers.get('cookie') || '';
	const geminiApiKey = request.headers.get('x-gemini-api-key')?.trim();
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Cookie: cookie
	};
	if (geminiApiKey) headers['X-Gemini-API-Key'] = geminiApiKey;

	try {
		const res = await fetch(`${BACKEND}/api/generate`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				model: 'gemini-2.5-flash',
				contents: [
					{
						role: 'user',
						parts: [{
							text: `މި މެސެޖަށް ދިވެހި ބަހުން ކުރު ސުރުޚީއެއް ލިޔޭ (2-4 ބަސް). ހަމައެކަނި ސުރުޚީ ލިޔޭ، އިތުރު އެއްޗެއް ނުލިޔާތި.\n\nމެސެޖް: ${message}`
						}]
					}
				],
				generationConfig: { maxOutputTokens: 20 }
			})
		});

		if (!res.ok) {
			return new Response(JSON.stringify({ title: '' }), {
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const data = await res.json();
		const title = (
			data?.candidates?.[0]?.content?.parts?.[0]?.text ||
			data?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
			''
		).trim().slice(0, 60);

		return new Response(JSON.stringify({ title }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch {
		return new Response(JSON.stringify({ title: '' }), {
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
