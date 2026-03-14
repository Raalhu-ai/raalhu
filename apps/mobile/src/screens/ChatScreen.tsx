import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import ChatInput from "../components/ChatInput";
import MarkdownText from "../components/MarkdownText";
import ThinkingBlock from "../components/ThinkingBlock";
import ToolCallStep from "../components/ToolCallStep";
import MessageCompose from "../components/MessageCompose";
import RecipeDisplay from "../components/RecipeDisplay";
import { WidgetDisplay } from "../components/WidgetDisplay";
import UserInputWidget from "../components/UserInputWidget";
import ArtifactCard from "../components/ArtifactCard";
import { PyodideSandboxProvider, useSandbox } from "../agent/PyodideSandboxProvider";
import { agentLoop, buildContents } from "../agent/loop";
import { getSystemPrompt } from "../agent/prompt";
import {
  saveAgentMessages,
  saveAgentContents,
  loadAgentContents,
  loadAgentMessages,
  fetchAITitle,
  updateSessionTitle,
} from "../chat-history";
import { loadSettings } from "../settings";
import type {
  AgentMessage,
  AgentStep,
  GeminiContent,
  UserInputQuestion,
} from "../agent/types";

// --- Spinner verbs ---
const SPINNER_VERBS = [
  "\u078C\u07A6\u0787\u07B0\u0794\u07A7\u0783\u07AA\u0786\u07AA\u0783\u07A6\u0782\u07A9",
  "\u0787\u07AA\u078A\u07A6\u0787\u07B0\u078B\u07A6\u0782\u07A9",
  "\u078B\u07A8\u0783\u07AA\u0788\u07A6\u0782\u07A9",
  "\u078E\u07AC\u0782\u07AC\u0790\u07B0\u078B\u07AC\u0782\u07A9",
  "\u0783\u07A7\u0788\u07A6\u0782\u07A9",
  "\u0780\u07AD\u078D\u07A6\u0787\u07B0\u0788\u07A6\u0782\u07A9",
  "\u0787\u07AC\u0787\u07B0\u0786\u07AA\u0783\u07A6\u0782\u07A9",
  "\u0788\u07A8\u0790\u07B0\u0782\u07A6\u0782\u07A9",
  "\u0780\u07AF\u078B\u07A6\u0782\u07A9",
  "\u078D\u07A8\u0794\u07A6\u0782\u07A9",
  "\u078B\u07A8\u0783\u07A7\u0790\u07A7\u0786\u07AA\u0783\u07A6\u0782\u07A9",
  "\u0786\u07AA\u0783\u07A8\u0787\u07A6\u0790\u07B0 \u078B\u07A6\u0782\u07A9",
  "\u078D\u07AF\u0791\u07B0\u0786\u07AA\u0783\u07A6\u0782\u07A9",
  "\u0795\u07B0\u0783\u07AE\u0790\u07AC\u0790\u07B0\u0786\u07AA\u0783\u07A6\u0782\u07A9",
];

const TOOL_VERBS: Record<string, string> = {
  web_search: "\u0788\u07AC\u0784\u07B0 \u0780\u07AF\u078B\u07A6\u0782\u07A9",
  web_fetch: "\u0788\u07AC\u0784\u07B0 \u078D\u07AF\u0791\u07B0\u0786\u07AA\u0783\u07A6\u0782\u07A9",
  message_compose: "\u0789\u07AC\u0790\u07AC\u0796\u07B0 \u078D\u07A8\u0794\u07A6\u0782\u07A9",
  recipe_display: "\u0783\u07AC\u0790\u07A8\u0795\u07A9 \u078C\u07A6\u0787\u07B0\u0794\u07A7\u0783\u07AA\u0786\u07AA\u0783\u07A6\u0782\u07A9",
  show_widget: "\u0788\u07A8\u0796\u07AC\u0793\u07B0 \u078B\u07AC\u0786\u07B0\u0786\u07AA\u0783\u07A6\u0782\u07A9",
  read_skill: "\u0790\u07B0\u0786\u07A8\u078D\u07B0 \u0786\u07A8\u0794\u07A6\u0782\u07A9",
  ask_user_input: "\u0790\u07AA\u0788\u07A7\u078D\u07AA\u0786\u07AA\u0783\u07A6\u0782\u07A9",
  execute_python: "\u0795\u07B0\u0783\u07AE\u0790\u07AC\u0790\u07B0\u0786\u07AA\u0783\u07A6\u0782\u07A9",
  write_file: "\u078A\u07A6\u0787\u07A8\u078D\u07B0 \u078D\u07A8\u0794\u07A6\u0782\u07A9",
  read_file: "\u078A\u07A6\u0787\u07A8\u078D\u07B0 \u0786\u07A8\u0794\u07A6\u0782\u07A9",
  list_directory: "\u078A\u07AF\u078D\u07B0\u0791\u07A6\u0783 \u0780\u07AF\u078B\u07A6\u0782\u07A9",
  present_file: "\u078A\u07A6\u0787\u07A8\u078D\u07B0 \u078B\u07AC\u0786\u07B0\u0786\u07AA\u0783\u07A6\u0782\u07A9",
};

interface ChatScreenProps {
  sessionId: string;
  model: string;
  models: string[];
  initialMessage?: string;
  onBack: () => void;
  onModelChange: (model: string) => void;
  onTitleChange: (sessionId: string, title: string) => void;
}

export default function ChatScreen(props: ChatScreenProps) {
  return (
    <PyodideSandboxProvider>
      <ChatScreenInner {...props} />
    </PyodideSandboxProvider>
  );
}

function ChatScreenInner({
  sessionId,
  model,
  models,
  initialMessage,
  onBack,
  onModelChange,
  onTitleChange,
}: ChatScreenProps) {
  const sandbox = useSandbox();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [spinnerVerb, setSpinnerVerb] = useState("");
  const [pendingQuestions, setPendingQuestions] = useState<UserInputQuestion[]>([]);
  const contentsRef = useRef<GeminiContent[]>([]);
  const titleRequestedRef = useRef(false);
  const verbTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [customInstructions, setCustomInstructions] = useState("");

  // Load custom instructions
  useEffect(() => {
    loadSettings().then((s) => setCustomInstructions(s.customInstructions));
  }, []);

  // Restore session or send initial message
  useEffect(() => {
    async function init() {
      const savedMessages = loadAgentMessages(sessionId);
      const savedContents = loadAgentContents(sessionId);

      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages);
        contentsRef.current = savedContents || [];
        titleRequestedRef.current = true;
      } else if (initialMessage) {
        handleSend(initialMessage);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Cleanup verb timer on unmount
  useEffect(() => {
    return () => {
      if (verbTimerRef.current) clearInterval(verbTimerRef.current);
    };
  }, []);

  function startVerbCycle() {
    let idx = Math.floor(Math.random() * SPINNER_VERBS.length);
    setSpinnerVerb(SPINNER_VERBS[idx]);
    verbTimerRef.current = setInterval(() => {
      idx = (idx + 1) % SPINNER_VERBS.length;
      setSpinnerVerb(SPINNER_VERBS[idx]);
    }, 3000);
  }

  function stopVerbCycle() {
    if (verbTimerRef.current) {
      clearInterval(verbTimerRef.current);
      verbTimerRef.current = null;
    }
    setSpinnerVerb("");
  }

  function setToolVerb(toolName: string) {
    if (verbTimerRef.current) {
      clearInterval(verbTimerRef.current);
      verbTimerRef.current = null;
    }
    setSpinnerVerb(TOOL_VERBS[toolName] || "\u0795\u07B0\u0783\u07AE\u0790\u07AC\u0790\u07B0\u0786\u07AA\u0783\u07A6\u0782\u07A9");
  }

  async function handleSend(text: string) {
    const msg = text.trim();
    if (!msg || running) return;

    const userMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
    };

    const assistantMsg: AgentMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      steps: [],
    };

    const newMessages = [...messages, userMsg, assistantMsg];
    setMessages(newMessages);
    setInputValue("");
    setRunning(true);
    startVerbCycle();

    contentsRef.current = buildContents(contentsRef.current, msg);

    const systemInstruction = {
      role: "user" as const,
      parts: [{ text: getSystemPrompt(customInstructions) }] as [{ text: string }],
    };

    // Debounced UI updates
    let uiTimer: ReturnType<typeof setTimeout> | null = null;
    const steps = assistantMsg.steps!;

    function scheduleUpdate() {
      if (!uiTimer) {
        uiTimer = setTimeout(() => {
          uiTimer = null;
          setMessages((prev) => {
            const copy = [...prev];
            copy[copy.length - 1] = { ...assistantMsg, steps: [...steps] };
            return copy;
          });
        }, 32);
      }
    }

    function flushUpdate() {
      if (uiTimer) {
        clearTimeout(uiTimer);
        uiTimer = null;
      }
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...assistantMsg, steps: [...steps] };
        return copy;
      });
    }

    try {
      const loop = agentLoop({
        model,
        contents: contentsRef.current,
        systemInstruction,
        sandbox,
      });

      for await (const event of loop) {
        switch (event.type) {
          case "thinking-delta": {
            const last = steps[steps.length - 1];
            if (last && last.kind === "thinking") {
              last.content = (last.content || "") + event.content;
            } else {
              steps.push({ kind: "thinking", content: event.content });
              setSpinnerVerb("\u0788\u07A8\u0790\u07B0\u0782\u07A6\u0782\u07A9");
            }
            scheduleUpdate();
            break;
          }

          case "text-delta": {
            const last = steps[steps.length - 1];
            if (last && last.kind === "text") {
              last.content += event.content;
            } else {
              steps.push({ kind: "text", content: event.content });
              setSpinnerVerb("\u078D\u07A8\u0794\u07A6\u0782\u07A9");
            }
            assistantMsg.content = steps
              .filter((s) => s.kind === "text")
              .map((s) => (s as { kind: "text"; content: string }).content)
              .join("");
            scheduleUpdate();
            break;
          }

          case "thinking":
            setSpinnerVerb("\u0788\u07A8\u0790\u07B0\u0782\u07A6\u0782\u07A9");
            steps.push({ kind: "thinking", content: event.content });
            flushUpdate();
            break;

          case "tool-call":
            setToolVerb(event.name);
            steps.push({
              kind: "tool-call",
              name: event.name,
              args: event.args,
              status: "running",
            });
            flushUpdate();
            break;

          case "tool-result": {
            startVerbCycle();
            for (let i = steps.length - 1; i >= 0; i--) {
              const s = steps[i];
              if (s.kind === "tool-call" && s.status === "running") {
                steps[i] = {
                  ...s,
                  status: event.result.success ? "done" : "error",
                  result: event.result,
                };
                break;
              }
            }
            flushUpdate();
            break;
          }

          case "text":
            setSpinnerVerb("\u078D\u07A8\u0794\u07A6\u0782\u07A9");
            steps.push({ kind: "text", content: event.content });
            assistantMsg.content = event.content;
            flushUpdate();
            break;

          case "ask-user-input":
            setPendingQuestions(event.questions);
            break;

          case "message-compose":
            steps.push({ kind: "message-compose", data: event.data });
            flushUpdate();
            break;

          case "recipe-display":
            steps.push({ kind: "recipe-display", data: event.data });
            flushUpdate();
            break;

          case "show-widget":
            steps.push({ kind: "show-widget", data: event.data });
            flushUpdate();
            break;

          case "artifact":
            steps.push({
              kind: "artifact",
              uri: event.uri,
              label: event.label,
              filename: event.filename,
              mimeType: event.mimeType,
            });
            flushUpdate();
            break;

          case "error":
            assistantMsg.content =
              (assistantMsg.content ? assistantMsg.content + "\n\n" : "") +
              `**Error:** ${event.message}`;
            steps.push({ kind: "text", content: `**Error:** ${event.message}` });
            flushUpdate();
            break;
        }
      }

      flushUpdate();
    } catch (err: any) {
      assistantMsg.content =
        (assistantMsg.content ? assistantMsg.content + "\n\n" : "") +
        `**Error:** ${err.message}`;
      steps.push({ kind: "text", content: `**Error:** ${err.message}` });
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { ...assistantMsg, steps: [...steps] };
        return copy;
      });
    }

    setRunning(false);
    stopVerbCycle();

    // Persist
    const finalMessages = [...messages, userMsg, { ...assistantMsg, steps: [...steps] }];
    saveAgentMessages(sessionId, finalMessages);
    saveAgentContents(sessionId, contentsRef.current);

    // AI title generation (first message only)
    if (!titleRequestedRef.current) {
      titleRequestedRef.current = true;
      const title = await fetchAITitle(msg);
      if (title) {
        updateSessionTitle(sessionId, title);
        onTitleChange(sessionId, title);
      }
    }
  }

  function handleUserInputSubmit(answer: string) {
    setPendingQuestions([]);
    if (answer.trim()) {
      handleSend(answer);
    }
  }

  function handleUserInputDismiss() {
    setPendingQuestions([]);
  }

  // Auto-scroll when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Render a single agent step
  function renderStep(step: AgentStep, idx: number) {
    switch (step.kind) {
      case "thinking":
        return <ThinkingBlock key={`t-${idx}`} content={step.content} />;
      case "text":
        return (
          <View key={`x-${idx}`}>
            <MarkdownText>{step.content}</MarkdownText>
          </View>
        );
      case "tool-call":
        return (
          <ToolCallStep
            key={`tc-${idx}`}
            name={step.name}
            args={step.args}
            status={step.status}
            result={step.result}
          />
        );
      case "message-compose":
        return <MessageCompose key={`mc-${idx}`} data={step.data} />;
      case "recipe-display":
        return <RecipeDisplay key={`rd-${idx}`} data={step.data} />;
      case "show-widget":
        return <WidgetDisplay key={`wd-${idx}`} data={step.data} onSendPrompt={handleSend} />;
      case "artifact":
        return (
          <ArtifactCard
            key={`af-${idx}`}
            uri={step.uri}
            label={step.label}
            filename={step.filename}
            mimeType={step.mimeType}
          />
        );
      default:
        return null;
    }
  }

  function renderMessage({ item }: { item: AgentMessage }) {
    if (item.role === "user") {
      return (
        <View className="mb-4 self-end max-w-[85%]">
          <View className="px-4 py-3 rounded-2xl bg-primary/10">
            <Text
              className="text-sm text-foreground"
              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl", lineHeight: 24 }}
            >
              {item.content}
            </Text>
          </View>
        </View>
      );
    }

    // Assistant message
    return (
      <View className="mb-4 max-w-[95%]">
        {item.steps && item.steps.length > 0 ? (
          item.steps.map((step, idx) => renderStep(step, idx))
        ) : item.content ? (
          <MarkdownText>{item.content}</MarkdownText>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-2 border-b border-border">
          <Pressable onPress={onBack} className="p-2 rounded-lg active:bg-accent">
            <Svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgb(156,163,175)"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M5 12h14M12 5l7 7-7 7" />
            </Svg>
          </Pressable>
          <View className="flex-1 mx-3">
            {running && spinnerVerb ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size={12} color="rgb(125,159,227)" />
                <Text
                  className="text-sm text-primary"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                  numberOfLines={1}
                >
                  {spinnerVerb}...
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />

        {/* User input widget overlay */}
        {pendingQuestions.length > 0 && (
          <View className="px-4">
            <UserInputWidget
              questions={pendingQuestions}
              onSubmit={handleUserInputSubmit}
              onDismiss={handleUserInputDismiss}
            />
          </View>
        )}

        {/* Chat input */}
        <View className="px-4 pb-4 pt-2">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            selectedModel={model}
            onModelChange={onModelChange}
            models={models}
            onSend={handleSend}
            disabled={running}
            autofocus={!initialMessage}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
