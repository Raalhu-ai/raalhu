import React, { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import Svg, { Path } from "react-native-svg";
import type { UserInputQuestion } from "../agent/types";

interface UserInputWidgetProps {
  questions: UserInputQuestion[];
  onSubmit: (answer: string) => void;
  onDismiss: () => void;
}

export default function UserInputWidget({ questions, onSubmit, onDismiss }: UserInputWidgetProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<Record<number, Set<string>>>({});
  const [customInputs, setCustomInputs] = useState<Record<number, string>>({});

  const question = questions[currentIdx];
  if (!question) return null;

  function toggleOption(option: string) {
    const current = selections[currentIdx] || new Set<string>();
    if (question.type === "multi_select") {
      const next = new Set(current);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      setSelections({ ...selections, [currentIdx]: next });
    } else {
      setSelections({ ...selections, [currentIdx]: new Set([option]) });
    }
  }

  function isSelected(option: string): boolean {
    return selections[currentIdx]?.has(option) ?? false;
  }

  function selectedCount(): number {
    return (selections[currentIdx]?.size ?? 0) + (customInputs[currentIdx]?.trim() ? 1 : 0);
  }

  function handleAdvance() {
    if (selectedCount() === 0) return;
    if (currentIdx >= questions.length - 1) {
      // Submit
      const lines: string[] = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const selected = Array.from(selections[i] || []);
        const custom = customInputs[i]?.trim();
        if (custom) selected.push(custom);
        if (selected.length === 0) continue;
        lines.push(q.question);
        lines.push(selected.join("\u060C "));
      }
      onSubmit(lines.join("\n"));
    } else {
      setCurrentIdx(currentIdx + 1);
    }
  }

  const isLast = currentIdx >= questions.length - 1;

  return (
    <View className="p-4 rounded-xl border border-primary/30 bg-card mb-3">
      {/* Question */}
      <Text
        className="text-sm text-foreground mb-3"
        style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 24 }}
      >
        {question.question}
      </Text>

      {/* Options */}
      <View className="gap-2 mb-3">
        {question.options.map((option) => (
          <Pressable
            key={option}
            onPress={() => toggleOption(option)}
            className={`flex-row items-center gap-2 px-3 py-2.5 rounded-lg border ${
              isSelected(option)
                ? "border-primary bg-primary/10"
                : "border-border active:bg-accent"
            }`}
          >
            <View
              className={`w-4 h-4 rounded-full border-2 items-center justify-center ${
                isSelected(option) ? "border-primary bg-primary" : "border-muted-foreground"
              }`}
            >
              {isSelected(option) && (
                <Svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="rgb(10,21,48)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M20 6 9 17l-5-5" />
                </Svg>
              )}
            </View>
            <Text
              className="text-sm text-foreground flex-1"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Custom input */}
      <TextInput
        value={customInputs[currentIdx] || ""}
        onChangeText={(text) => setCustomInputs({ ...customInputs, [currentIdx]: text })}
        placeholder="އެހެން ޖަވާބެއް ލިޔުއްވާ..."
        placeholderTextColor="rgba(156,163,175,0.5)"
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm mb-3"
        style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 22 }}
      />

      {/* Actions */}
      <View className="flex-row gap-2">
        <Pressable
          onPress={onDismiss}
          className="px-3 py-2 rounded-lg border border-border active:bg-accent"
        >
          <Text
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
          >
            ދޫކޮށްލާ
          </Text>
        </Pressable>
        <Pressable
          onPress={handleAdvance}
          disabled={selectedCount() === 0}
          className={`px-4 py-2 rounded-lg ${
            selectedCount() > 0 ? "bg-primary active:opacity-90" : "bg-muted opacity-50"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              selectedCount() > 0 ? "text-primary-foreground" : "text-muted-foreground"
            }`}
            style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
          >
            {isLast ? "ފޮނުވާ" : "ދެން"}
          </Text>
        </Pressable>
      </View>

      {/* Progress dots */}
      {questions.length > 1 && (
        <View className="flex-row items-center justify-center gap-1.5 mt-3">
          {questions.map((_, idx) => (
            <View
              key={idx}
              className={`w-1.5 h-1.5 rounded-full ${
                idx === currentIdx ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}
