import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, ClipboardPaste } from "lucide-react";
import { startLogin, exchangeCode } from "./api";

interface LoginPageProps {
  onBack: () => void;
  onLoginSuccess: () => Promise<void>;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="w-7 h-7 text-primary animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function LoginPage({ onBack, onLoginSuccess }: LoginPageProps) {
  const [authUrl, setAuthUrl] = useState(() => sessionStorage.getItem("oauth_url") || "");
  const [authState, setAuthState] = useState(() => sessionStorage.getItem("oauth_state") || "");
  const [codeInput, setCodeInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [automatic, setAutomatic] = useState(false);
  const [callbackNotice, setCallbackNotice] = useState("");
  const exchangeInProgress = useRef(false);
  const leaving = useRef(false);
  const receiveCallback = useRef<(url: string) => Promise<void>>(async () => {});

  // Polling retains a received callback in the main process across renderer reloads.
  // Subscribe before opening the browser; only stop on completion or explicit cancellation.
  useEffect(() => {
    const platform = window.platform;
    if (!authState || !platform?.startOAuthCallback) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await platform!.readOAuthCallback(authState);
        if (cancelled) return;
        if (result.status === "received") {
          await receiveCallback.current(result.url);
          return;
        }
        if (result.status !== "waiting") {
          setAutomatic(false);
          setCallbackNotice(result.status === "expired"
            ? "Sign-in timed out. Start Google sign-in again."
            : "Automatic return is unavailable. Use the manual callback option below.");
          return;
        }
        timer = setTimeout(poll, 500);
      } catch {
        if (!cancelled) {
          setAutomatic(false);
          setCallbackNotice("Automatic return is unavailable. Use the manual callback option below.");
        }
      }
    }
    platform.startOAuthCallback(authState).then((available) => {
      if (cancelled) return;
      setAutomatic(available);
      void poll();
    }).catch(() => {
      if (!cancelled) setCallbackNotice("Automatic return is unavailable. Use the manual callback option below.");
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [authState]);

  async function openUrl(url: string) {
    if (window.platform?.openExternal) {
      await window.platform.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  }

  async function handleStartLogin() {
    if (starting) return;
    setStarting(true);
    setLoginError("");
    setCallbackNotice("");
    try {
      const res = await startLogin();
      if (leaving.current) return;
      setAuthUrl(res.authUrl);
      setAuthState(res.state);
      sessionStorage.setItem("oauth_state", res.state);
      sessionStorage.setItem("oauth_url", res.authUrl);
      setCodeInput("");
      // Bind the loopback port before Google can redirect back to it.
      const available = await window.platform?.startOAuthCallback(res.state).catch(() => false);
      if (leaving.current) {
        await window.platform?.stopOAuthCallback(res.state).catch(() => {});
        return;
      }
      setAutomatic(Boolean(available));
      if (!available) setCallbackNotice("Automatic return is unavailable. Use the manual callback option below.");
      await openUrl(res.authUrl);
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginError(err.message || "ސައިން އިން ފެށުމުގައި މައްސަލައެއް ދިމާވެއްޖެ");
    } finally {
      setStarting(false);
    }
  }

  async function handleReopenTab() {
    setLoginError("");
    try {
      if (authUrl) await openUrl(authUrl);
      else await handleStartLogin();
    } catch (err: any) {
      setLoginError(err.message || "Could not open the Google sign-in page.");
    }
  }

  async function completeLogin(callbackUrl: string) {
    if (!callbackUrl.trim() || exchangeInProgress.current) return;
    if (!authState) {
      setLoginError("Start Google sign-in first, then paste the complete callback URL.");
      return;
    }
    setLoginError("");
    exchangeInProgress.current = true;
    setSubmitting(true);
    try {
      const callback = new URL(callbackUrl.trim());
      if (callback.searchParams.has("error")) {
        throw new Error("Google sign-in was not completed. Please start sign-in again.");
      }
      await exchangeCode(callbackUrl, authState);
      sessionStorage.removeItem("oauth_state");
      sessionStorage.removeItem("oauth_url");
      setAuthState("");
      setAuthUrl("");
      setCodeInput("");
      await onLoginSuccess();
    } catch (err: any) {
      setAutomatic(false);
      setLoginError(err.message || "ކޯޑް ބަލައިގަތުމުގައި މައްސަލައެއް ދިމާވެއްޖެ");
      setSubmitting(false);
    } finally {
      exchangeInProgress.current = false;
      await window.platform?.stopOAuthCallback(authState).catch(() => {});
    }
  }

  receiveCallback.current = async (url) => {
    setCodeInput(url);
    await completeLogin(url);
  };

  async function handleSubmitCode() {
    if (starting || submitting) return;
    await completeLogin(codeInput);
  }

  function handleBack() {
    leaving.current = true;
    if (authState) void window.platform?.stopOAuthCallback(authState).catch(() => {});
    sessionStorage.removeItem("oauth_state");
    sessionStorage.removeItem("oauth_url");
    onBack();
  }

  function handleCodeKeydown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmitCode();
  }

  if (submitting) {
    return (
      <div className="h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Spinner />
          <p className="thaana text-lg text-muted-foreground">ސައިން އިން ކުރަނީ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto flex flex-col px-6 py-24">

      {/* Back to home */}
      <button
        onClick={handleBack}
        className="desktop-login-back absolute top-6 start-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground/60
          hover:text-muted-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="thaana">ފަހަތަށް</span>
      </button>

      {/* Step-by-step login */}
      <div className="max-w-md w-full mx-auto my-auto shrink-0 animate-fade-in-up">

        {/* Header */}
        <h1 className="thaana-heading text-6xl sm:text-7xl leading-none mb-10 text-center">
          <span className="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
            ސައިން އިން
          </span>
        </h1>

        <div className="space-y-8">

          {/* Step 1: Sign in with Google */}
          <div className="relative text-center" dir="rtl">
            <div className="absolute start-0 top-0.5 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">1</div>
            <div className="space-y-5">
              <p className="thaana text-base text-foreground px-10">
                ގޫގުލް އެކައުންޓުން ސައިން އިން ކުރައްވާ
              </p>
              <button
                onClick={handleStartLogin}
                disabled={starting}
                className="inline-flex items-center gap-3 px-5 h-11 bg-card border border-border/60
                  rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <GoogleIcon />
                <span className="thaana text-foreground text-sm font-medium">ގޫގުލް އިން ސައިން އިން ކުރައްވާ</span>
              </button>
            </div>
          </div>

          <div
            role="status"
            className="text-sm text-muted-foreground text-center"
            dir={automatic || callbackNotice ? "ltr" : "rtl"}
            lang={automatic || callbackNotice ? "en" : "dv"}
          >
            {automatic
              ? "Finish signing in with Google in your browser. Raalhu will return to the foreground and finish sign-in automatically."
              : callbackNotice || (
                <span className="thaana block !leading-[2.4]" dir="rtl" lang="dv">
                  ގޫގުލް އިން ސައިން އިން ވުމަށް ބްރައުޒަރު ހުޅުވޭނެއެވެ. އެއަށްފަހު އޮޓޮމެޓިކްކޮށް ރާޅަށް އަނބުރާ އަންނާނެއެވެ.
                </span>
              )}
          </div>

          <details open={!automatic && Boolean(authState)}>
            <summary className="thaana text-sm text-muted-foreground cursor-pointer text-center !leading-[2.4]" dir="rtl" lang="dv">
              ދަތިތަކަކާ ދިމާވޭތޯ؟ ކޯލްބެކް ލިންކު މެނުއަލްކޮށް ޕޭސްޓް ކުރައްވާ
            </summary>
            <div className="flex flex-col gap-6 mt-4">
              {/* Step 2: Copy the complete loopback callback URL */}
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">2</div>
                <div className="min-w-0 flex-1">
                  <p className="thaana text-base text-foreground mb-3">
                    ސައިން އިން ވުމަށްފަހު ބްރައުޒަރުގެ އެޑްރެސް ބާރުން ފުރިހަމަ ލިންކު ކޮޕީ ކުރައްވާ
                  </p>
                  <div id="callback-help" className="rounded-lg border border-border/60 bg-card p-3 text-sm text-muted-foreground space-y-3">
                    <p className="thaana leading-relaxed" dir="rtl">
                      ޕޭޖް ނުހުޅުވޭ ކަމަށް އެރަރެއް ފެންނަނީ ނަމަވެސް، އެޑްރެސް ބާރުގައިވާ ފުރިހަމަ ލިންކު ކޮޕީކޮށް ތިރީގައި ޕޭސްޓް ކުރައްވާ.
                    </p>
                    <p dir="ltr" lang="en" className="leading-relaxed text-left">
                      After choosing your Google account, you may see <strong className="font-medium text-foreground">“This site can’t be reached”</strong> or “localhost refused to connect”. This is expected for this sign-in method. Copy the entire URL from that page’s address bar, return to this app, and paste it below. You don’t need to reload the error page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: Paste the callback URL */}
              <div>
                <div className="flex items-start gap-4 mb-3">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">3</div>
                  <p className="thaana text-base text-foreground">
                    ފުރިހަމަ ލިންކު ތިރީގައި ޕޭސްޓް ކުރައްވާ
                  </p>
                </div>
                <div className="relative" dir="ltr">
                  <ClipboardPaste className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                  <input
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    aria-label="Google callback URL"
                    aria-describedby="callback-help"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={handleCodeKeydown}
                    placeholder="http://localhost:51121/oauth-callback?…"
                    className="w-full pl-10 pr-4 h-12 bg-background border border-border/60 rounded-xl
                      text-foreground font-mono text-base
                      placeholder:text-muted-foreground/40 placeholder:text-sm
                      focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
                    style={{ fontFamily: undefined }}
                  />
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button
                  onClick={handleSubmitCode}
                  disabled={!codeInput.trim() || starting}
                  className="thaana w-full h-12 bg-primary text-primary-foreground font-semibold text-lg
                    rounded-xl hover:bg-primary/90 transition-colors duration-150
                    disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  ކުރިއަށް
                </button>
              </div>
            </div>
          </details>
        </div>

        {/* Re-open tab link */}
        <div className="text-center mt-6">
          <button
            onClick={handleReopenTab}
            disabled={starting}
            className="thaana inline-flex items-center gap-1.5 text-sm text-muted-foreground/60
              hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            ގޫގުލް ޕޭޖް އަލުން ހުޅުވާ
          </button>
        </div>

        {loginError && (
          <p role="alert" className="thaana text-sm text-red-400 mt-4 text-center">{loginError}</p>
        )}
      </div>

    </div>
  );
}
