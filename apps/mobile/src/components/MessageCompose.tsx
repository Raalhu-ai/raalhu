import React, { useState } from "react";
import { View, Text, Pressable, Alert } from "react-native";
import * as Clipboard from "expo-clipboard";
import Svg, { Path } from "react-native-svg";
import type { MessageComposeData } from "../agent/types";

interface MessageComposeProps {
  data: MessageComposeData;
}

export default function MessageCompose({ data }: MessageComposeProps) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function copyVariant(idx: number, text: string) {
    await Clipboard.setStringAsync(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  return (
    <View className="mb-3">
      <Text
        className="text-sm text-foreground font-medium mb-2"
        style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
      >
        {data.summaryTitle}
      </Text>
      {data.variants.map((variant, idx) => (
        <View
          key={idx}
          className="mb-2 p-3 rounded-xl border border-border bg-card"
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text
              className="text-xs text-primary font-semibold"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
            >
              {variant.label}
            </Text>
            <Pressable
              onPress={() => copyVariant(idx, variant.subject ? `${variant.subject}\n\n${variant.body}` : variant.body)}
              className="p-1 rounded active:bg-accent"
            >
              <Svg
                width={14}
                height={14}
                viewBox="0 0 24 24"
                fill="none"
                stroke={copiedIdx === idx ? "rgb(74,222,128)" : "rgb(156,163,175)"}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {copiedIdx === idx ? (
                  <Path d="M20 6 9 17l-5-5" />
                ) : (
                  <>
                    <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <Path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1Z" />
                  </>
                )}
              </Svg>
            </Pressable>
          </View>
          {variant.subject && (
            <Text
              className="text-xs text-muted-foreground mb-1"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
            >
              Subject: {variant.subject}
            </Text>
          )}
          <Text
            className="text-sm text-foreground"
            style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 22 }}
          >
            {variant.body}
          </Text>
        </View>
      ))}
    </View>
  );
}
