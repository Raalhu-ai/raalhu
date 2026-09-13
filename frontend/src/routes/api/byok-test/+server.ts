import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request, platform }) => {
  const backend = (platform?.env as any)?.BACKEND_URL || "http://localhost:3000";
  const headers = new Headers();
  for (const name of ["x-ai-provider", "x-ai-api-key", "x-gemini-api-key"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(new URL("/api/byok-test", backend), {
      method: "POST", headers, signal: AbortSignal.timeout(25000), redirect: "error",
    });
    return new Response(response.body, {
      status: response.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Key validation is temporarily unavailable. Try again.", status: "untested" }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
};
