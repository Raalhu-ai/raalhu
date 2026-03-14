import { View, Text, type ViewProps } from "react-native";
import { cn } from "../utils";

interface BadgeProps extends ViewProps {
  variant?: "default" | "accent" | "muted";
  label: string;
  className?: string;
}

const variantStyles = {
  default: "bg-background-elevated",
  accent: "bg-accent-light/20",
  muted: "bg-foreground-muted/10",
};

const textVariantStyles = {
  default: "text-foreground",
  accent: "text-accent-light",
  muted: "text-foreground-muted",
};

export function Badge({ variant = "default", label, className, ...props }: BadgeProps) {
  return (
    <View
      className={cn("rounded-full px-2.5 py-0.5", variantStyles[variant], className)}
      {...props}
    >
      <Text className={cn("text-xs font-medium", textVariantStyles[variant])}>
        {label}
      </Text>
    </View>
  );
}
