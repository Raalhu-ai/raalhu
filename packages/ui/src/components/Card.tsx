import { View, type ViewProps } from "react-native";
import { cn } from "../utils";

interface CardProps extends ViewProps {
  className?: string;
}

export function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={cn("rounded-xl bg-background-card p-4", className)}
      {...props}
    />
  );
}
