import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect, Circle, Line, Polyline } from "react-native-svg";
import {
  loadSettings,
  saveSettings,
  getFontSize,
  type Settings,
} from "../settings";
import type { User } from "../api";
import { clearAllSessions } from "../chat-history";

interface SettingsPageProps {
  user: User | null;
  onLogout: () => void;
  onBack: () => void;
}

const themeOptions: { value: Settings["theme"]; label: string }[] = [
  { value: "light", label: "އަލި" },
  { value: "dark", label: "އަނދިރި" },
  { value: "system", label: "ސިސްޓަމް" },
];

const fontSizeOptions: { value: Settings["fontSize"]; label: string }[] = [
  { value: "small", label: "ކުޑަ" },
  { value: "medium", label: "މެދު" },
  { value: "large", label: "ބޮޑު" },
];

export default function SettingsPage({ user, onLogout, onBack }: SettingsPageProps) {
  const [settings, setSettingsState] = useState<Settings>({
    theme: "dark",
    fontSize: "medium",
    customInstructions: "",
  });
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSettings().then(setSettingsState);
  }, []);

  function update(partial: Partial<Settings>) {
    const next = { ...settings, ...partial };
    setSettingsState(next);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveSettings(next), 100);
  }

  function setTheme(theme: Settings["theme"]) {
    update({ theme });
  }

  function setFontSize(fontSize: Settings["fontSize"]) {
    update({ fontSize });
  }

  async function clearAllChats() {
    setClearing(true);
    try {
      clearAllSessions();
      setClearDialogOpen(false);
    } catch (err) {
      console.error("Failed to clear chats:", err);
    } finally {
      setClearing(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="max-w-2xl w-full self-center px-4 py-8">
          {/* Header */}
          <View className="flex-row items-center gap-3 mb-8">
            <Pressable
              onPress={onBack}
              className="p-2 rounded-lg active:bg-accent"
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgb(156,163,175)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12h14M12 5l7 7-7 7" />
              </Svg>
            </Pressable>
            <Text
              className="text-3xl text-foreground"
              style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", marginTop: 8 }}
            >
              ސެޓިންގްސް
            </Text>
          </View>

          {/* Appearance */}
          <View className="mb-8">
            <Text
              className="text-xl text-foreground mb-4"
              style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", marginTop: 6 }}
            >
              ފެންނަ ގޮތް
            </Text>

            {/* Theme */}
            <View className="mb-5">
              <Text
                className="text-sm text-muted-foreground mb-2"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
              >
                ތީމް
              </Text>
              <View className="flex-row gap-2">
                {themeOptions.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setTheme(opt.value)}
                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-lg border ${
                      settings.theme === opt.value
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        settings.theme === opt.value
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }`}
                      style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Font Size */}
            <View>
              <Text
                className="text-sm text-muted-foreground mb-2"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
              >
                ފޮންޓް ސައިޒް
              </Text>
              <View className="flex-row gap-2">
                {fontSizeOptions.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setFontSize(opt.value)}
                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-lg border ${
                      settings.fontSize === opt.value
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        settings.fontSize === opt.value
                          ? "text-primary-foreground"
                          : "text-foreground"
                      }`}
                      style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {/* Preview */}
              <View className="mt-3 p-3 rounded-lg bg-card border border-border">
                <Text
                  className="text-muted-foreground"
                  style={{
                    fontFamily: "MV Typewriter",
                    writingDirection: "rtl",
                    fontSize: getFontSize(settings.fontSize),
                    lineHeight: getFontSize(settings.fontSize) * 2.4,
                  }}
                >
                  މިއީ ފޮންޓް ސައިޒް ޕްރީވިއު އެކެވެ.
                </Text>
              </View>
            </View>
          </View>

          <View className="h-px bg-border mb-8" />

          {/* Custom Instructions */}
          <View className="mb-8">
            <Text
              className="text-xl text-foreground mb-2"
              style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", marginTop: 6 }}
            >
              ކަސްޓަމް އިރުޝާދު
            </Text>
            <Text
              className="text-sm text-muted-foreground mb-4"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 24 }}
            >
              އޭ.އައި އަށް ކަލާ އާ ބެހޭ ގޮތުން ކިޔައިދީ، ނުވަތަ ޖަވާބު ދޭންވީ ގޮތް ބުނެދީ.
            </Text>
            <TextInput
              value={settings.customInstructions}
              onChangeText={(text) => update({ customInstructions: text })}
              placeholder="މިސާލު: އަހަރެންނަކީ ދަރިވަރެއް. ކުރު ޖަވާބު ދީ..."
              placeholderTextColor="rgba(156,163,175,0.5)"
              multiline
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-base"
              style={{
                fontFamily: "MV Typewriter",
                writingDirection: "rtl",
                minHeight: 128,
                textAlignVertical: "top",
              }}
            />
          </View>

          <View className="h-px bg-border mb-8" />

          {/* Chat History */}
          <View className="mb-8">
            <Text
              className="text-xl text-foreground mb-2"
              style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", marginTop: 6 }}
            >
              ޗެޓް ހިސްޓްރީ
            </Text>
            <Text
              className="text-sm text-muted-foreground mb-4"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 24 }}
            >
              ހުރިހާ ޗެޓް ހިސްޓްރީ ފޮހެލާ. މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެ.
            </Text>
            <Pressable
              onPress={() => setClearDialogOpen(true)}
              className="flex-row items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/30 self-start"
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgb(229,77,46)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <Line x1={10} x2={10} y1={11} y2={17} />
                <Line x1={14} x2={14} y1={11} y2={17} />
              </Svg>
              <Text
                className="text-destructive text-sm"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
              >
                ހުރިހާ ޗެޓް ފޮހެލާ
              </Text>
            </Pressable>
          </View>

          <View className="h-px bg-border mb-8" />

          {/* Account */}
          <View>
            <Text
              className="text-xl text-foreground mb-4"
              style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", marginTop: 6 }}
            >
              އެކައުންޓް
            </Text>
            {user && (
              <View className="flex-row items-center gap-4 p-4 rounded-lg bg-card border border-border mb-4">
                {user.picture ? (
                  <Image
                    source={{ uri: user.picture }}
                    className="w-12 h-12 rounded-full"
                  />
                ) : null}
                <View className="flex-1">
                  <Text className="text-sm text-foreground font-medium" numberOfLines={1}>{user.name}</Text>
                  <Text className="text-xs text-muted-foreground" numberOfLines={1}>{user.email}</Text>
                </View>
              </View>
            )}
            <Pressable
              onPress={onLogout}
              className="flex-row items-center gap-2 px-4 py-2.5 rounded-lg border border-border self-start active:bg-accent"
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgb(232,234,237)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <Polyline points="16 17 21 12 16 7" />
                <Line x1={21} x2={9} y1={12} y2={12} />
              </Svg>
              <Text
                className="text-foreground text-sm"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
              >
                ލޮގް އައުޓް
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Clear Chats Confirmation Dialog */}
      <Modal
        visible={clearDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setClearDialogOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 items-center justify-center"
          onPress={() => setClearDialogOpen(false)}
        >
          <Pressable
            className="bg-popover border border-border rounded-xl p-6 mx-4 w-full max-w-sm"
            onPress={() => {}}
          >
            <Text
              className="text-lg text-foreground mb-2"
              style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", marginTop: 6 }}
            >
              ޗެޓް ފޮހެލާ
            </Text>
            <Text
              className="text-sm text-muted-foreground mb-6"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 24 }}
            >
              ހުރިހާ ޗެޓް ހިސްޓްރީ ފޮހެލަން ޔަޤީންތަ؟ މި ޢަމަލު އަނބުރާ ނުގެނެވޭނެ.
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                onPress={() => setClearDialogOpen(false)}
                className="px-4 py-2 rounded-lg border border-border active:bg-accent"
              >
                <Text
                  className="text-sm text-foreground"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                >
                  ކެންސަލް
                </Text>
              </Pressable>
              <Pressable
                onPress={clearAllChats}
                disabled={clearing}
                className="px-4 py-2 rounded-lg bg-destructive active:opacity-90"
                style={{ opacity: clearing ? 0.5 : 1 }}
              >
                <Text
                  className="text-sm text-destructive-foreground"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                >
                  {clearing ? "ފޮހެނީ..." : "ފޮހެލާ"}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
