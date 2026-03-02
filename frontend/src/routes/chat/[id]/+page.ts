export function load({ params }: { params: { id: string } }) {
	return { sessionId: params.id };
}
