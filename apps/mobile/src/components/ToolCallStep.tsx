import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";

const TOOL_LABELS: Record<string, string> = {
  web_search: "ވެބް ހޯދުން",
  web_fetch: "ވެބް ފެޗް",
  message_compose: "މެސެޖް ލިޔުން",
  recipe_display: "ރެސިޕީ",
  show_widget: "ވިޖެޓް",
  read_skill: "ސްކިލް ކިޔުން",
  ask_user_input: "ސުވާލުކުރުން",
};

interface ToolCallStepProps {
  name: string;
  args: Record<string, unknown>;
  status: "running" | "done" | "error";
  result?: Record<string, unknown> | string;
}

export default function ToolCallStep({ name, args, status, result }: ToolCallStepProps) {
  const [expanded, setExpanded] = useState(false);
  const label = TOOL_LABELS[name] || name;

  return (
    <View className="mb-2">
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        className="flex-row items-center gap-2 py-1.5"
      >
        {status === "running" ? (
          <ActivityIndicator size={12} color="rgb(125,159,227)" />
        ) : status === "done" ? (
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgb(74,222,128)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M20 6 9 17l-5-5" />
          </Svg>
        ) : (
          <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgb(229,77,46)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Circle cx={12} cy={12} r={10} />
            <Path d="m15 9-6 6M9 9l6 6" />
          </Svg>
        )}
        <Text
          className="text-xs text-muted-foreground"
          style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
        >
          {label}
        </Text>
        <Svg
          width={10}
          height={10}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(156,163,175,0.5)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {expanded ? <Path d="m6 9 6 6 6-6" /> : <Path d="m9 18 6-6-6-6" />}
        </Svg>
      </Pressable>

      {expanded && (
        <View className="ml-6 mt-1 p-2 rounded-lg bg-muted/50">
          {args && Object.keys(args).length > 0 && (
            <View className="mb-2">
              <Text className="text-xs text-muted-foreground font-medium mb-1">Args</Text>
              <Text className="text-xs text-muted-foreground font-mono" numberOfLines={10}>
                {JSON.stringify(args, null, 2).slice(0, 500)}
              </Text>
            </View>
          )}
          {result && (
            <View>
              <Text className="text-xs text-muted-foreground font-medium mb-1">Result</Text>
              <Text className="text-xs text-muted-foreground font-mono" numberOfLines={10}>
                {typeof result === "string" ? result.slice(0, 500) : JSON.stringify(result, null, 2).slice(0, 500)}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
