import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, platform }) => {
	const BACKEND = (platform?.env as any)?.BACKEND_URL || 'http://localhost:3000';
	const cookie = request.headers.get('cookie') || '';

	const formData = await request.formData();
	const audioFile = formData.get('audio') as File;

	if (!audioFile) {
		return new Response(JSON.stringify({ error: 'No audio file' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const arrayBuffer = await audioFile.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	const base64Audio = btoa(binary);

	const mimeType = audioFile.type || 'audio/webm';

	try {
		const res = await fetch(`${BACKEND}/api/generate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: cookie,
			},
			body: JSON.stringify({
				model: 'gemini-2.5-flash',
				contents: [
					{
						role: 'user',
						parts: [
							{
								inlineData: {
									mimeType,
									data: base64Audio,
								},
							},
							{
								text: 'Transcribe this audio exactly as spoken. Output ONLY the transcribed text, nothing else. If the audio is in Dhivehi (Thaana script), output in Thaana. If in English, output in English. Do not add any formatting, labels, or explanation.',
							},
						],
					},
				],
				generationConfig: { maxOutputTokens: 2048 },
			}),
		});

		if (!res.ok) {
			return new Response(JSON.stringify({ error: 'Transcription failed' }), {
				status: res.status,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const data = await res.json();
		const text = (
			data?.candidates?.[0]?.content?.parts?.[0]?.text ||
			data?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
			''
		).trim();

		return new Response(JSON.stringify({ text }), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Transcription failed' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
