import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "../utils";

interface TextProps extends RNTextProps {
  variant?: "body" | "heading" | "muted" | "thaana" | "thaana-heading";
  className?: string;
}

const variantStyles = {
  body: "text-foreground text-base",
  heading: "text-foreground text-xl font-bold",
  muted: "text-foreground-muted text-sm",
  thaana: "text-foreground text-base font-thaana",
  "thaana-heading": "text-foreground text-xl font-thaana-heading",
};

export function Text({ variant = "body", className, ...props }: TextProps) {
  return (
    <RNText
      className={cn(variantStyles[variant], className)}
      {...props}
    />
  );
}
