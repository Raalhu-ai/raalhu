import React, { useState } from "react";
import { ArrowLeft, ExternalLink, ClipboardPaste } from "lucide-react";
import { startLogin, exchangeCode } from "./api";

declare global {
  interface Window {
    platform: {
      isDesktop: boolean;
      platform: string;
      openExternal: (url: string) => Promise<void>;
    };
  }
}

interface LoginPageProps {
  onBack: () => void;
  onLoginSuccess: () => void;
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
  const [authUrl, setAuthUrl] = useState("");
  const [authState, setAuthState] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function openUrl(url: string) {
    if (window.platform?.openExternal) {
      window.platform.openExternal(url);
    } else {
      window.open(url, "_blank");
    }
  }

  async function handleStartLogin() {
    setLoginError("");
    try {
      const res = await startLogin();
      setAuthUrl(res.authUrl);
      setAuthState(res.state);
      openUrl(res.authUrl);
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginError(err.message || "ސައިން އިން ފެށުމުގައި މައްސަލައެއް ދިމާވެއްޖެ");
    }
  }

  function handleReopenTab() {
    if (authUrl) openUrl(authUrl);
    else handleStartLogin();
  }

  async function handleSubmitCode() {
    if (!codeInput.trim()) return;
    setLoginError("");
    setSubmitting(true);
    try {
      await exchangeCode(codeInput, authState);
      onLoginSuccess();
    } catch (err: any) {
      setLoginError(err.message || "ކޯޑް ބަލައިގަތުމުގައި މައްސަލައެއް ދިމާވެއްޖެ");
      setSubmitting(false);
    }
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
    <div className="h-screen flex flex-col items-center justify-center px-6 overflow-hidden">

      {/* Back to home */}
      <button
        onClick={onBack}
        className="absolute top-6 start-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground/60
          hover:text-muted-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="thaana">ފަހަތަށް</span>
      </button>

      {/* Step-by-step login */}
      <div className="max-w-md w-full mx-auto animate-fade-in-up">

        {/* Header */}
        <h1 className="thaana-heading text-6xl sm:text-7xl leading-none mb-10 text-center">
          <span className="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
            ސައިން އިން
          </span>
        </h1>

        <div className="flex flex-col gap-6">

          {/* Step 1: Sign in with Google */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">1</div>
            <div className="flex-1">
              <p className="thaana text-base text-foreground mb-3">
                ގޫގުލް އެކައުންޓުން ސައިން އިން ކުރައްވާ
              </p>
              <button
                onClick={handleStartLogin}
                className="inline-flex items-center gap-3 px-5 h-11 bg-card border border-border/60
                  rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <GoogleIcon />
                <span className="thaana text-foreground text-sm font-medium">ގޫގުލް އިން ސައިން އިން ކުރައްވާ</span>
              </button>
            </div>
          </div>

          {/* Step 2: Copy code */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">2</div>
            <p className="thaana text-base text-foreground">
              ސައިން އިން ވުމުން ފެންނަ ކޯޑް ކޮޕީ ކުރައްވާ
            </p>
          </div>

          {/* Step 3: Paste code */}
          <div>
            <div className="flex items-start gap-4 mb-3">
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">3</div>
              <p className="thaana text-base text-foreground">
                ކޯޑް ތިރީގައި ޕޭސްޓް ކުރައްވާ
              </p>
            </div>
            <div className="relative" dir="ltr">
              <ClipboardPaste className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={handleCodeKeydown}
                placeholder="ކޯޑް މިތާ ޕޭސްޓް ކުރައްވާ"
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
              disabled={!codeInput.trim()}
              className="thaana w-full h-12 bg-primary text-primary-foreground font-semibold text-lg
                rounded-xl hover:bg-primary/90 transition-colors duration-150
                disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              ކުރިއަށް
            </button>
          </div>
        </div>

        {/* Re-open tab link */}
        <div className="text-center mt-6">
          <button
            onClick={handleReopenTab}
            className="thaana inline-flex items-center gap-1.5 text-sm text-muted-foreground/60
              hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            ގޫގުލް ޕޭޖް އަލުން ހުޅުވާ
          </button>
        </div>

        {loginError && (
          <p className="thaana text-sm text-red-400 mt-4 text-center">{loginError}</p>
        )}
      </div>

    </div>
  );
}
