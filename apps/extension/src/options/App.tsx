import { View } from "react-native";
import { Button, Card, Text, TextInput } from "@raalhu/ui";
import { useState } from "react";

export default function OptionsApp() {
  const [apiUrl, setApiUrl] = useState("");

  return (
    <View className="min-h-screen items-center bg-background p-8">
      <View className="w-full max-w-lg gap-6">
        <Text variant="thaana-heading" className="text-2xl">
          ރާޅު ސެޓިންގްސް
        </Text>

        <Card className="gap-4">
          <Text variant="thaana" className="font-medium">
            API URL
          </Text>
          <TextInput
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="https://api.raalhu.mv"
          />

          <Button
            onPress={() => {
              chrome.storage.sync.set({ apiUrl });
            }}
          >
            ސޭވް ކުރޭ
          </Button>
        </Card>

        <Card className="gap-3">
          <Text variant="thaana" className="font-medium">
            އެކައުންޓް
          </Text>
          <Text variant="muted">
            Extension scaffold — login integration pending
          </Text>
        </Card>
      </View>
    </View>
  );
}
