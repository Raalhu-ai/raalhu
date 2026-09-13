import { createServer, type Server } from "node:http";

export type OAuthCallbackStatus =
  | { status: "waiting" | "unavailable" | "expired" }
  | { status: "received"; url: string };

/** One short-lived, loopback-only listener per desktop sign-in attempt. */
export class OAuthCallbackListener {
  private servers: Server[] = [];
  private state = "";
  private result: OAuthCallbackStatus = { status: "unavailable" };
  private timer?: ReturnType<typeof setTimeout>;
  private starting?: Promise<boolean>;
  private pendingBinds = new Set<() => void>();

  constructor(private readonly onCallback: () => void, private readonly options = {
    port: 51121,
    timeoutMs: 10 * 60 * 1000,
  }) {}

  start(state: string): Promise<boolean> {
    if (!state || state.length > 256) return Promise.resolve(false);
    if (state === this.state) {
      return this.starting ?? Promise.resolve(this.result.status === "waiting" || this.result.status === "received");
    }
    this.stop();
    this.state = state;
    this.result = { status: "waiting" };
    const starting = this.listen(state);
    this.starting = starting;
    return starting;
  }

  private async listen(state: string): Promise<boolean> {
    // localhost can resolve to either address family. Never bind a public interface.
    try {
      for (const host of ["127.0.0.1", "::1"]) {
        if (this.state !== state) return false;
        if (this.result.status === "received") return true;
        const server = createServer((req, res) => {
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
          res.setHeader("Referrer-Policy", "no-referrer");
          let url: URL;
          try {
            url = new URL(req.url || "", `http://localhost:${this.options.port}`);
          } catch {
            res.writeHead(400).end("Invalid callback.");
            return;
          }
          if (req.method !== "GET" || req.headers.host !== `localhost:${this.options.port}` ||
              url.origin !== `http://localhost:${this.options.port}` || url.pathname !== "/oauth-callback" ||
              url.username || url.password || url.hash) {
            res.writeHead(404).end("Not found.");
            return;
          }
          if (this.state !== state || this.result.status !== "waiting" ||
              url.searchParams.getAll("state").length !== 1 || url.searchParams.get("state") !== state ||
              (!url.searchParams.has("error") &&
                (url.searchParams.getAll("code").length !== 1 || !url.searchParams.get("code")))) {
            res.writeHead(400).end("This callback does not match the current sign-in. Return to the app and try again.");
            return;
          }
          this.result = { status: "received", url: url.href };
          res.end("Return to Raalhu to finish signing in. You can close this tab.");
          this.closeServers();
          this.onCallback();
        });
        server.requestTimeout = 5000;
        server.headersTimeout = 5000;
        this.servers.push(server);
        await new Promise<void>((resolve, reject) => {
          const cancel = () => reject(new Error("Callback listener cancelled."));
          this.pendingBinds.add(cancel);
          const failed = (error: Error) => {
            this.pendingBinds.delete(cancel);
            reject(error);
          };
          server.once("error", failed);
          server.listen({ host, port: this.options.port, ipv6Only: true }, () => {
            this.pendingBinds.delete(cancel);
            server.removeListener("error", failed);
            if (this.state !== state) {
              server.close();
              resolve();
              return;
            }
            server.on("error", () => {
              if (this.state === state) {
                this.result = { status: "unavailable" };
                this.closeServers();
              }
            });
            resolve();
          });
        });
        if (this.state !== state) {
          server.close();
          return false;
        }
        if (this.read(state).status === "received") {
          this.closeServers();
          return true;
        }
      }
      this.timer = setTimeout(() => {
        this.result = { status: "expired" };
        this.closeServers();
      }, this.options.timeoutMs);
      this.timer.unref();
      return true;
    } catch {
      if (this.state === state) {
        if (this.result.status === "received") return true;
        this.result = { status: "unavailable" };
        this.closeServers();
      }
      return false;
    } finally {
      if (this.state === state) this.starting = undefined;
    }
  }

  read(state: string): OAuthCallbackStatus {
    return state === this.state ? this.result : { status: "unavailable" };
  }

  stop(state?: string) {
    if (state && state !== this.state) return;
    this.closeServers();
    this.state = "";
    this.starting = undefined;
    this.result = { status: "unavailable" };
  }

  private closeServers() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    for (const cancel of this.pendingBinds) cancel();
    this.pendingBinds.clear();
    for (const server of this.servers) {
      server.close();
      server.closeIdleConnections();
    }
    this.servers = [];
  }
}
