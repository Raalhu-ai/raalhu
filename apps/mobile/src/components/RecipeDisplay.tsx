import React, { useState, useRef, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import type { RecipeData, RecipeIngredient } from "../agent/types";

interface RecipeDisplayProps {
  data: RecipeData;
}

function formatAmount(amount: number, unit?: string): string {
  const rounded = Math.round(amount * 100) / 100;
  const display = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  return unit ? `${display} ${unit}` : display;
}

export default function RecipeDisplay({ data }: RecipeDisplayProps) {
  const baseServings = data.base_servings || 4;
  const [servings, setServings] = useState(baseServings);
  const scale = servings / baseServings;

  function scaledIngredient(ing: RecipeIngredient): string {
    return `${formatAmount(ing.amount * scale, ing.unit)} ${ing.name}`;
  }

  function resolveIngredientRefs(text: string): string {
    return text.replace(/\{(\w+)\}/g, (_, id) => {
      const ing = data.ingredients.find((i) => i.id === id);
      if (!ing) return `{${id}}`;
      return formatAmount(ing.amount * scale, ing.unit);
    });
  }

  return (
    <View className="mb-3 rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <View className="p-4 border-b border-border">
        <Text
          className="text-lg text-foreground font-semibold"
          style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", marginTop: 4 }}
        >
          {data.title}
        </Text>
        {data.description && (
          <Text
            className="text-sm text-muted-foreground mt-1"
            style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 22 }}
          >
            {data.description}
          </Text>
        )}
        {/* Servings adjuster */}
        <View className="flex-row items-center gap-3 mt-3">
          <Text
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
          >
            ސާރވިންގްސް:
          </Text>
          <Pressable
            onPress={() => setServings(Math.max(1, servings - 1))}
            className="w-7 h-7 rounded-full border border-border items-center justify-center active:bg-accent"
          >
            <Text className="text-foreground text-sm">−</Text>
          </Pressable>
          <Text className="text-foreground text-sm font-medium" style={{ minWidth: 20, textAlign: "center" }}>
            {servings}
          </Text>
          <Pressable
            onPress={() => setServings(servings + 1)}
            className="w-7 h-7 rounded-full border border-border items-center justify-center active:bg-accent"
          >
            <Text className="text-foreground text-sm">+</Text>
          </Pressable>
        </View>
      </View>

      {/* Ingredients */}
      <View className="p-4 border-b border-border">
        <Text
          className="text-sm text-foreground font-semibold mb-2"
          style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", marginTop: 4 }}
        >
          ބާވަތްތައް
        </Text>
        {data.ingredients.map((ing) => (
          <View key={ing.id} className="flex-row items-start gap-2 mb-1.5">
            <View className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
            <Text
              className="text-sm text-foreground flex-1"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 22 }}
            >
              {scaledIngredient(ing)}
            </Text>
          </View>
        ))}
      </View>

      {/* Steps */}
      <View className="p-4">
        <Text
          className="text-sm text-foreground font-semibold mb-3"
          style={{ fontFamily: "Sangu Suruhee", writingDirection: "rtl", marginTop: 4 }}
        >
          ތައްޔާރުކުރާނެ ގޮތް
        </Text>
        {data.steps.map((step, idx) => (
          <View key={step.id} className="mb-4">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="w-5 h-5 rounded-full bg-primary/20 items-center justify-center">
                <Text className="text-xs text-primary font-medium">{idx + 1}</Text>
              </View>
              <Text
                className="text-sm text-foreground font-medium"
                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
              >
                {step.title}
              </Text>
            </View>
            <Text
              className="text-sm text-muted-foreground ml-7"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 22 }}
            >
              {resolveIngredientRefs(step.content)}
            </Text>
            {step.timer_seconds && (
              <StepTimer seconds={step.timer_seconds} />
            )}
          </View>
        ))}
      </View>

      {/* Notes */}
      {data.notes && (
        <View className="px-4 pb-4">
          <Text
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 20, fontStyle: "italic" }}
          >
            {data.notes}
          </Text>
        </View>
      )}
    </View>
  );
}

function StepTimer({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function toggle() {
    if (running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      setRunning(false);
    } else {
      setRemaining(seconds);
      setRunning(true);
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <Pressable onPress={toggle} className="flex-row items-center gap-1.5 ml-7 mt-1.5">
      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={running ? "rgb(74,222,128)" : "rgb(125,159,227)"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <Circle cx={12} cy={12} r={10} />
        <Path d="M12 6v6l4 2" />
      </Svg>
      <Text className={`text-xs ${running ? "text-green-400" : "text-primary"} font-mono`}>
        {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
      </Text>
    </Pressable>
  );
}
