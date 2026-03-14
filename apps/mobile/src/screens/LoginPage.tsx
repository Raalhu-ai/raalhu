import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import Svg, { Path, Circle } from "react-native-svg";
import { startLogin, exchangeCode } from "../api";

interface LoginPageProps {
  onBack: () => void;
  onLoginSuccess: () => void;
}

function GoogleIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

function StepBadge({ number }: { number: number }) {
  return (
    <View className="w-7 h-7 rounded-full bg-primary/15 items-center justify-center mt-0.5">
      <Text className="text-primary text-xs font-bold">{number}</Text>
    </View>
  );
}

export default function LoginPage({ onBack, onLoginSuccess }: LoginPageProps) {
  const [authUrl, setAuthUrl] = useState("");
  const [authState, setAuthState] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleStartLogin() {
    setLoginError("");
    try {
      const res = await startLogin();
      setAuthUrl(res.authUrl);
      setAuthState(res.state);
      await WebBrowser.openBrowserAsync(res.authUrl);
    } catch (err: any) {
      console.error("Login error:", err);
      setLoginError(err.message || "ސައިން އިން ފެށުމުގައި މައްސަލައެއް ދިމާވެއްޖެ");
    }
  }

  async function handleReopenBrowser() {
    if (authUrl) await WebBrowser.openBrowserAsync(authUrl);
    else await handleStartLogin();
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

  /* Submitting spinner */
  if (submitting) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-6">
          <View className="items-center gap-4">
            <ActivityIndicator size="large" color="rgb(125,159,227)" />
            <Text
              className="text-lg text-muted-foreground"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
            >
              ސައިން އިން ކުރަނީ...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <Pressable
            onPress={onBack}
            className="absolute top-4 left-4 z-10 flex-row items-center gap-1.5 px-2 py-1"
          >
            <Svg
              width={16}
              height={16}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(156,163,175)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M19 12H5M12 19l-7-7 7-7" />
            </Svg>
            <Text
              className="text-sm text-muted-foreground/60"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
            >
              ފަހަތަށް
            </Text>
          </Pressable>

          <View className="px-6 w-full max-w-md self-center">
            {/* Header */}
            <Text
              className="text-6xl text-center text-primary mb-10"
              style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", lineHeight: 80 }}
            >
              ސައިން އިން
            </Text>

            {/* Step 1: Sign in with Google */}
            <View className="flex-row items-start gap-4 mb-6">
              <StepBadge number={1} />
              <View className="flex-1">
                <Text
                  className="text-base text-foreground mb-3"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 28 }}
                >
                  ގޫގުލް އެކައުންޓުން ސައިން އިން ކުރައްވާ
                </Text>
                <Pressable
                  onPress={handleStartLogin}
                  className="flex-row items-center gap-3 px-5 h-11 bg-card border border-border/60 rounded-lg active:bg-accent"
                  style={{ alignSelf: "flex-start" }}
                >
                  <GoogleIcon />
                  <Text
                    className="text-foreground text-sm font-medium"
                    style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                  >
                    ގޫގުލް އިން ސައިން އިން ކުރައްވާ
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Step 2: Copy code */}
            <View className="flex-row items-start gap-4 mb-6">
              <StepBadge number={2} />
              <Text
                className="text-base text-foreground flex-1"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 28 }}
              >
                ސައިން އިން ވުމުން ފެންނަ ކޯޑް ކޮޕީ ކުރައްވާ
              </Text>
            </View>

            {/* Step 3: Paste code */}
            <View className="mb-2">
              <View className="flex-row items-start gap-4 mb-3">
                <StepBadge number={3} />
                <Text
                  className="text-base text-foreground flex-1"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 28 }}
                >
                  ކޯޑް ތިރީގައި ޕޭސްޓް ކުރައްވާ
                </Text>
              </View>
              <TextInput
                value={codeInput}
                onChangeText={setCodeInput}
                onSubmitEditing={handleSubmitCode}
                placeholder="Paste code here"
                placeholderTextColor="rgba(156,163,175,0.4)"
                autoCapitalize="none"
                autoCorrect={false}
                className="w-full h-12 px-4 bg-background border border-border/60 rounded-xl text-foreground text-base"
                style={{ fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}
              />
            </View>

            {/* Submit button */}
            <View className="pt-4">
              <Pressable
                onPress={handleSubmitCode}
                disabled={!codeInput.trim()}
                className="w-full h-12 bg-primary rounded-xl items-center justify-center active:opacity-90"
                style={{ opacity: codeInput.trim() ? 1 : 0.4 }}
              >
                <Text
                  className="text-primary-foreground font-semibold text-lg"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                >
                  ކުރިއަށް
                </Text>
              </Pressable>
            </View>

            {/* Re-open browser link */}
            <View className="items-center mt-6">
              <Pressable
                onPress={handleReopenBrowser}
                className="flex-row items-center gap-1.5"
              >
                <Svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgb(156,163,175)"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                </Svg>
                <Text
                  className="text-sm text-muted-foreground/60"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                >
                  ގޫގުލް ޕޭޖް އަލުން ހުޅުވާ
                </Text>
              </Pressable>
            </View>

            {/* Error message */}
            {loginError ? (
              <Text
                className="text-sm text-red-400 mt-4 text-center"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 24 }}
              >
                {loginError}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
