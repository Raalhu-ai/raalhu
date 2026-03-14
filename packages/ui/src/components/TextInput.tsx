import { TextInput as RNTextInput, type TextInputProps as RNTextInputProps } from "react-native";
import { cn } from "../utils";

interface TextInputProps extends RNTextInputProps {
  className?: string;
}

export function TextInput({ className, ...props }: TextInputProps) {
  return (
    <RNTextInput
      className={cn(
        "rounded-lg border border-foreground-muted/20 bg-background-elevated px-4 py-3 text-foreground placeholder:text-foreground-muted",
        className
      )}
      placeholderTextColor="#b0b3b8"
      {...props}
    />
  );
}
