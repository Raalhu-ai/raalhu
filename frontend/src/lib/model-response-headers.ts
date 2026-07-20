const MODEL_RESPONSE_HEADERS = [
	'X-Resolved-Model-Module',
	'X-Resolved-AI-Provider',
	'X-BYOK-Error-Origin'
];

export function modelResponseHeaders(
	source: Headers,
	base: HeadersInit = {}
): Headers {
	const headers = new Headers(base);
	for (const name of MODEL_RESPONSE_HEADERS) {
		const value = source.get(name);
		if (value) headers.set(name, value);
	}
	return headers;
}
