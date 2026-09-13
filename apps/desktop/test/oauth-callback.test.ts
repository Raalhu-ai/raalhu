import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server } from "node:http";
import { OAuthCallbackListener } from "../src/oauth-callback";

const port = 51131;
let focused = 0;
let listener: OAuthCallbackListener;
let blocker: Server | undefined;

function createListener(timeoutMs = 10000) {
  focused = 0;
  listener = new OAuthCallbackListener(() => focused++, { port, timeoutMs });
  return listener;
}

async function callback(path: string, host = "127.0.0.1", method = "GET") {
  const response = await fetch(`http://${host}:${port}${path}`, {
    method,
    headers: { Host: `localhost:${port}`, Connection: "close" },
  });
  const body = await response.text();
  return { status: response.status, body, headers: response.headers };
}

afterEach(async () => {
  listener?.stop();
  if (blocker) {
    await new Promise<void>((resolve) => blocker!.close(() => resolve()));
    blocker = undefined;
  }
});

describe("desktop OAuth loopback callback", () => {
  test("receives an IPv4 callback, focuses once, and retains it across reloads", async () => {
    expect(await createListener().start("attempt")).toBe(true);
    const response = await callback("/oauth-callback?code=secret-code&state=attempt");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.body).not.toContain("secret-code");
    expect(focused).toBe(1);
    expect(listener.read("attempt")).toEqual({
      status: "received", url: `http://localhost:${port}/oauth-callback?code=secret-code&state=attempt`,
    });
    expect(await listener.start("attempt")).toBe(true);
    expect(listener.read("attempt").status).toBe("received");
    expect(listener.read("different").status).toBe("unavailable");
    listener.stop("attempt");
    expect(listener.read("attempt").status).toBe("unavailable");
  });

  test("also accepts localhost callbacks over IPv6", async () => {
    expect(await createListener().start("ipv6")).toBe(true);
    expect((await callback("/oauth-callback?code=abc&state=ipv6", "[::1]")).status).toBe(200);
    expect(focused).toBe(1);
  });

  test("rejects wrong state, duplicate parameters, wrong paths, and POST without consuming the attempt", async () => {
    expect(await createListener().start("valid")).toBe(true);
    for (const path of [
      "/oauth-callback?code=abc&state=wrong",
      "/oauth-callback?code=abc&state=valid&state=valid",
      "/oauth-callback?code=abc&code=def&state=valid",
      "/oauth-callback?state=valid",
    ]) expect((await callback(path)).status).toBe(400);
    expect((await callback("/other?code=abc&state=valid")).status).toBe(404);
    expect((await callback("/oauth-callback?code=abc&state=valid", "127.0.0.1", "POST")).status).toBe(404);
    expect(focused).toBe(0);
    expect(listener.read("valid").status).toBe("waiting");
    expect((await callback("/oauth-callback?code=abc&state=valid")).status).toBe(200);
  });

  test("returns denial to the app so it can show a recoverable error", async () => {
    expect(await createListener().start("denied")).toBe(true);
    expect((await callback("/oauth-callback?error=access_denied&state=denied")).status).toBe(200);
    expect(listener.read("denied").status).toBe("received");
    expect(focused).toBe(1);
  });

  test("reports an occupied port without disrupting the existing listener", async () => {
    blocker = createServer();
    await new Promise<void>((resolve) => blocker!.listen(port, "127.0.0.1", resolve));
    expect(await createListener().start("busy")).toBe(false);
    expect(listener.read("busy").status).toBe("unavailable");
    expect(blocker.listening).toBe(true);
  });

  test("expires and releases the port", async () => {
    expect(await createListener(20).start("old")).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(listener.read("old").status).toBe("expired");
    expect(await listener.start("old")).toBe(false);
    expect(await listener.start("new")).toBe(true);
    listener.stop("old");
    expect(listener.read("new").status).toBe("waiting");
  });

  test("coalesces simultaneous startup and cancels explicitly", async () => {
    const instance = createListener();
    expect(await Promise.all([instance.start("same"), instance.start("same")])).toEqual([true, true]);
    instance.stop("same");
    expect(instance.read("same").status).toBe("unavailable");
    expect(await instance.start("next")).toBe(true);
  });

  test("cancels while startup is in progress without leaving the port bound", async () => {
    const instance = createListener();
    const pending = instance.start("cancelled");
    instance.stop("cancelled");
    expect(await pending).toBe(false);
    expect(await instance.start("replacement")).toBe(true);
    expect((await callback("/oauth-callback?code=abc&state=cancelled")).status).toBe(400);
    expect(instance.read("replacement").status).toBe("waiting");
  });

  test("rejects a non-localhost Host header", async () => {
    expect(await createListener().start("valid")).toBe(true);
    const response = await fetch(`http://127.0.0.1:${port}/oauth-callback?code=abc&state=valid`, {
      headers: { Host: "example.com", Connection: "close" },
    });
    await response.text();
    expect(response.status).toBe(404);
    expect(listener.read("valid").status).toBe("waiting");
  });
});
