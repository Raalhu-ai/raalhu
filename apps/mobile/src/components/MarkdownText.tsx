import React from "react";
import { StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";

interface MarkdownTextProps {
  children: string;
  fontSize?: number;
}

export default function MarkdownText({ children, fontSize = 16 }: MarkdownTextProps) {
  const styles = StyleSheet.create({
    body: {
      color: "#e8eaed",
      fontSize,
      fontFamily: "MV Typewriter",
      lineHeight: fontSize * 1.8,
      writingDirection: "rtl",
    },
    heading1: {
      color: "#e8eaed",
      fontSize: fontSize * 1.5,
      fontFamily: "Sangu Suruhee",
      fontWeight: "600",
      marginTop: 16,
      marginBottom: 8,
      writingDirection: "rtl",
    },
    heading2: {
      color: "#e8eaed",
      fontSize: fontSize * 1.3,
      fontFamily: "Sangu Suruhee",
      fontWeight: "600",
      marginTop: 12,
      marginBottom: 6,
      writingDirection: "rtl",
    },
    heading3: {
      color: "#e8eaed",
      fontSize: fontSize * 1.1,
      fontFamily: "Sangu Suruhee",
      fontWeight: "600",
      marginTop: 8,
      marginBottom: 4,
      writingDirection: "rtl",
    },
    strong: {
      fontWeight: "700",
      color: "#e8eaed",
    },
    em: {
      fontStyle: "italic",
    },
    link: {
      color: "#7d9fe3",
      textDecorationLine: "underline",
    },
    blockquote: {
      backgroundColor: "rgba(125,159,227,0.08)",
      borderLeftWidth: 3,
      borderLeftColor: "#7d9fe3",
      paddingLeft: 12,
      paddingVertical: 4,
      marginVertical: 8,
    },
    code_inline: {
      backgroundColor: "rgba(255,255,255,0.08)",
      color: "#e8eaed",
      fontFamily: "monospace",
      fontSize: fontSize * 0.9,
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
    },
    code_block: {
      backgroundColor: "rgba(0,0,0,0.3)",
      color: "#e8eaed",
      fontFamily: "monospace",
      fontSize: fontSize * 0.85,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    fence: {
      backgroundColor: "rgba(0,0,0,0.3)",
      color: "#e8eaed",
      fontFamily: "monospace",
      fontSize: fontSize * 0.85,
      padding: 12,
      borderRadius: 8,
      marginVertical: 8,
    },
    list_item: {
      flexDirection: "row-reverse",
      writingDirection: "rtl",
    },
    bullet_list_icon: {
      color: "#7d9fe3",
      marginLeft: 8,
    },
    ordered_list_icon: {
      color: "#7d9fe3",
      marginLeft: 8,
    },
    paragraph: {
      marginVertical: 4,
    },
    hr: {
      backgroundColor: "rgba(255,255,255,0.1)",
      height: 1,
      marginVertical: 12,
    },
    table: {
      borderColor: "rgba(255,255,255,0.15)",
    },
    thead: {
      backgroundColor: "rgba(255,255,255,0.05)",
    },
    th: {
      color: "#e8eaed",
      fontWeight: "600",
      padding: 8,
    },
    td: {
      color: "#e8eaed",
      padding: 8,
    },
    tr: {
      borderBottomWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
    },
  });

  return (
    <Markdown style={styles}>
      {children}
    </Markdown>
  );
}
