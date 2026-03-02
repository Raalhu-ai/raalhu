export function load({ params }: { params: { id: string } }) {
	return { projectId: params.id };
}
