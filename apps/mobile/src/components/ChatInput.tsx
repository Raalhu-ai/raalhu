import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import Svg, { Path, Circle, Line } from "react-native-svg";
import { modelDisplayName } from "@raalhu/shared";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: string[];
  placeholder?: string;
  onSend: (message: string) => void;
  disabled?: boolean;
  autofocus?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  selectedModel,
  onModelChange,
  models,
  placeholder = "މެސެޖެއް ލިޔުއްވާ...",
  onSend,
  disabled = false,
  autofocus = false,
}: ChatInputProps) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const hasContent = value.trim().length > 0;

  function handleSend() {
    if (!hasContent || disabled) return;
    onSend(value);
  }

  return (
    <View className="w-full">
      <View className="rounded-2xl border border-border bg-card">
        <View className="px-3 pt-3 pb-3 gap-2">
          {/* Text input */}
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChange}
            onSubmitEditing={handleSend}
            placeholder={placeholder}
            placeholderTextColor="rgba(156,163,175,0.6)"
            multiline
            blurOnSubmit={false}
            autoFocus={autofocus}
            editable={!disabled}
            className="w-full bg-transparent text-foreground text-lg px-1 py-1"
            style={{
              fontFamily: "MV Typewriter",
              writingDirection: "rtl",
              minHeight: 40,
              maxHeight: 200,
              textAlignVertical: "top",
              lineHeight: 28,
            }}
          />

          {/* Action bar */}
          <View className="flex-row items-center gap-1">
            {/* Plus button */}
            <Pressable className="h-8 w-8 rounded-lg items-center justify-center active:bg-accent">
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgb(156,163,175)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M5 12h14M12 5v14" />
              </Svg>
            </Pressable>

            {/* Model switcher */}
            {models.length > 0 && (
              <Pressable
                onPress={() => setModelMenuOpen(true)}
                className="flex-row items-center gap-1.5 h-8 px-2 rounded-lg active:bg-accent"
              >
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgb(156,163,175)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  <Path d="M5 3v4M19 17v4M3 5h4M17 19h4" />
                </Svg>
                <Text
                  className="text-muted-foreground text-xs font-medium"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", maxWidth: 120 }}
                  numberOfLines={1}
                >
                  {modelDisplayName(selectedModel)}
                </Text>
              </Pressable>
            )}

            <View className="flex-1" />

            {/* Send button */}
            <Pressable
              onPress={handleSend}
              disabled={!hasContent || disabled}
              className={`h-8 w-8 rounded-xl items-center justify-center ${
                hasContent ? "bg-primary" : "opacity-50"
              }`}
            >
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={hasContent ? "rgb(10,21,48)" : "rgb(156,163,175)"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 19V5M5 12l7-7 7 7" />
              </Svg>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Model picker modal */}
      <Modal
        visible={modelMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModelMenuOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setModelMenuOpen(false)}
        >
          <Pressable
            className="bg-popover border-t border-border rounded-t-2xl px-4 pt-4 pb-8"
            onPress={() => {}}
          >
            <Text
              className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-3 text-right"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
            >
              މޮޑެލް
            </Text>
            {models.map((model) => (
              <Pressable
                key={model}
                onPress={() => {
                  onModelChange(model);
                  setModelMenuOpen(false);
                }}
                className={`flex-row items-center justify-between px-3 py-3 rounded-lg mb-1 ${
                  selectedModel === model ? "bg-accent" : "active:bg-accent/50"
                }`}
              >
                <Text
                  className={`text-sm ${selectedModel === model ? "text-foreground font-medium" : "text-muted-foreground"}`}
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                >
                  {modelDisplayName(model)}
                </Text>
                {selectedModel === model && (
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgb(125,159,227)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M20 6 9 17l-5-5" />
                  </Svg>
                )}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
