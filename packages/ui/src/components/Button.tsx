import { Pressable, Text, type PressableProps } from "react-native";
import { cn } from "../utils";

interface ButtonProps extends PressableProps {
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
  textClassName?: string;
}

const variantStyles = {
  default: "bg-accent-light active:bg-accent",
  outline: "border border-foreground-muted bg-transparent active:bg-background-elevated",
  ghost: "bg-transparent active:bg-background-elevated",
};

const sizeStyles = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2",
  lg: "px-6 py-3",
};

const textVariantStyles = {
  default: "text-white",
  outline: "text-foreground",
  ghost: "text-foreground",
};

const textSizeStyles = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
};

export function Button({
  variant = "default",
  size = "md",
  children,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  return (
    <Pressable
      className={cn(
        "items-center justify-center rounded-lg",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {typeof children === "string" ? (
        <Text
          className={cn(
            "font-medium",
            textVariantStyles[variant],
            textSizeStyles[size],
            textClassName
          )}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
