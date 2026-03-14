import React, { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect, Circle } from "react-native-svg";
import { STARTERS, getGreeting, getFirstName } from "@raalhu/shared";
import ChatInput from "../components/ChatInput";

/* ── SVG Icons matching starter modes ── */

function StarterIcon({ icon, color }: { icon: string; color: string }) {
  const props = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  switch (icon) {
    case "FileText":
      return (
        <Svg {...props}>
          <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <Path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <Path d="M10 9H8M16 13H8M16 17H8" />
        </Svg>
      );
    case "RefreshCw":
      return (
        <Svg {...props}>
          <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <Path d="M21 3v5h-5" />
          <Path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <Path d="M8 16H3v5" />
        </Svg>
      );
    case "FileDown":
      return (
        <Svg {...props}>
          <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <Path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <Path d="M12 18v-6M9 15l3 3 3-3" />
        </Svg>
      );
    case "Languages":
      return (
        <Svg {...props}>
          <Path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6" />
        </Svg>
      );
    case "Search":
      return (
        <Svg {...props}>
          <Circle cx={11} cy={11} r={8} />
          <Path d="m21 21-4.3-4.3" />
        </Svg>
      );
    case "Globe":
      return (
        <Svg {...props}>
          <Circle cx={12} cy={12} r={10} />
          <Path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
        </Svg>
      );
    case "Bot":
      return (
        <Svg {...props}>
          <Path d="M12 8V4H8" />
          <Rect width={16} height={12} x={4} y={8} rx={2} />
          <Path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
        </Svg>
      );
    default:
      return null;
  }
}

/* ── Hamburger icon ── */
function MenuIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 6h16M4 12h16M4 18h16" />
    </Svg>
  );
}

interface DashboardProps {
  userName: string;
  onSendMessage: (text: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: string[];
  onOpenSidebar: () => void;
}

export default function Dashboard({
  userName,
  onSendMessage,
  selectedModel,
  onModelChange,
  models,
  onOpenSidebar,
}: DashboardProps) {
  const [greeting] = useState(() => getGreeting());
  const [inputValue, setInputValue] = useState("");

  const firstName = getFirstName(userName);

  function handleSend(message: string) {
    const text = message.trim();
    if (!text) return;
    onSendMessage(text);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header with hamburger */}
      <View className="flex-row items-center px-4 py-2">
        <Pressable
          onPress={onOpenSidebar}
          className="p-2 rounded-lg active:bg-accent"
        >
          <MenuIcon color="rgb(156,163,175)" />
        </Pressable>
        <View className="flex-1" />
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Greeting */}
        <View className="items-center mb-10">
          <Text
            className="text-7xl text-center text-primary mb-3"
            style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", lineHeight: 90 }}
          >
            {greeting.heading}{firstName ? `، ${firstName}` : ""}
          </Text>
          <Text
            className="text-base text-muted-foreground text-center"
            style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 28 }}
          >
            {greeting.subtitle}
          </Text>
        </View>

        {/* Chat input */}
        <View className="w-full max-w-2xl self-center mb-6">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            models={models}
            onSend={handleSend}
            autofocus={false}
          />
        </View>

        {/* Starter chips */}
        <View className="flex-row flex-wrap justify-center gap-2 max-w-2xl self-center">
          {STARTERS.filter((s) => s.starterText).map((starter) => (
            <Pressable
              key={starter.id}
              onPress={() => setInputValue(starter.starterText)}
              className="flex-row items-center gap-1.5 px-3.5 py-2 bg-muted border border-border rounded-full active:bg-accent"
            >
              <StarterIcon icon={starter.icon} color="rgba(125,159,227,0.8)" />
              <Text
                className="text-foreground text-xs"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
              >
                {starter.labelDv}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
