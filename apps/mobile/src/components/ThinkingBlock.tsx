import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Svg, { Path } from "react-native-svg";

interface ThinkingBlockProps {
  content?: string;
}

export default function ThinkingBlock({ content }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  return (
    <Pressable
      onPress={() => setExpanded((prev) => !prev)}
      className="mb-2"
    >
      <View className="flex-row items-center gap-1.5 py-1">
        <Svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(156,163,175,0.6)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {expanded ? (
            <Path d="m6 9 6 6 6-6" />
          ) : (
            <Path d="m9 18 6-6-6-6" />
          )}
        </Svg>
        <Text
          className="text-xs text-muted-foreground"
          style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", fontStyle: "italic" }}
        >
          ވިސްނުން
        </Text>
      </View>
      {expanded && (
        <View className="pl-4 mt-1">
          <Text
            className="text-xs text-muted-foreground"
            style={{
              fontFamily: "MV Typewriter",
              writingDirection: "rtl",
              fontStyle: "italic",
              lineHeight: 20,
              opacity: 0.7,
            }}
          >
            {content}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
