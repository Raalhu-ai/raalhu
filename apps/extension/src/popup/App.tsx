import { View, ScrollView } from "react-native";
import { Button, Card, Text, TextInput } from "@raalhu/ui";
import { useState } from "react";

export default function PopupApp() {
  const [input, setInput] = useState("");

  return (
    <View className="w-[380px] bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-foreground-muted/10 px-4 py-3">
        <Text variant="thaana-heading" className="text-lg">
          ރާޅު
        </Text>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => chrome.runtime.openOptionsPage()}
        >
          Settings
        </Button>
      </View>

      {/* Chat area */}
      <ScrollView className="h-[400px] px-4 py-3">
        <Card className="mb-3">
          <Text variant="muted" className="text-center text-sm">
            Extension scaffold ready
          </Text>
        </Card>
      </ScrollView>

      {/* Input */}
      <View className="border-t border-foreground-muted/10 p-3">
        <View className="flex-row gap-2">
          <TextInput
            className="flex-1"
            placeholder="މެސެޖެއް ލިޔޭ..."
            value={input}
            onChangeText={setInput}
          />
          <Button size="sm" onPress={() => setInput("")}>
            ފޮނުވާ
          </Button>
        </View>
      </View>
    </View>
  );
}
