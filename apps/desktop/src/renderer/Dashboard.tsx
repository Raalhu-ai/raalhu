import React, { useState, useEffect } from "react";
import { STARTERS, getGreeting, getFirstName } from "@raalhu/shared";
import {
  FileText, RefreshCw, FileDown, Languages, Search, Globe, Bot,
} from "lucide-react";
import ChatInput, { type ChatInputSendData } from "./ChatInput";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  FileText,
  RefreshCw,
  FileDown,
  Languages,
  Search,
  Globe,
  Bot,
};

interface DashboardProps {
  userName: string;
  onSendMessage: (text: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  models: string[];
}

export default function Dashboard({
  userName,
  onSendMessage,
  selectedModel,
  onModelChange,
  models,
}: DashboardProps) {
  const [greeting] = useState(() => getGreeting());
  const [inputValue, setInputValue] = useState("");

  const firstName = getFirstName(userName);

  function handleSend(data: ChatInputSendData) {
    const text = data.message.trim();
    if (!text) return;
    onSendMessage(text);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-16">
      {/* Greeting */}
      <div className="animate-greeting-in text-center mb-10 max-w-2xl">
        <h1 className="thaana-heading text-7xl sm:text-8xl font-normal mb-3 leading-none">
          <span className="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
            {greeting.heading}{firstName ? `، ${firstName}` : ""}
          </span>
        </h1>
        <p
          className="thaana text-muted-foreground text-base animate-fade-in"
          style={{ animationDelay: "200ms" }}
        >
          {greeting.subtitle}
        </p>
      </div>

      {/* Centered input */}
      <div
        className="w-full max-w-2xl mb-6 animate-fade-in-up"
        style={{ animationDelay: "150ms" }}
      >
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          models={models}
          onSend={handleSend}
          autofocus={true}
        />
      </div>

      {/* Starter chips */}
      <div
        className="flex flex-wrap justify-center gap-2 max-w-2xl animate-fade-in-up"
        style={{ animationDelay: "300ms" }}
      >
        {STARTERS.filter((s) => s.starterText).map((starter) => {
          const Icon = ICON_MAP[starter.icon];
          return (
            <button
              key={starter.id}
              type="button"
              onClick={() => setInputValue(starter.starterText)}
              className="thaana inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] leading-none
                bg-muted border border-border rounded-full
                hover:border-primary/40 hover:bg-accent
                transition-all duration-150 cursor-pointer
                focus:outline-none focus:ring-2 focus:ring-ring/50"
            >
              {Icon && <Icon className="w-3.5 h-3.5 text-primary/80 shrink-0" />}
              <span className="translate-y-px">{starter.labelDv}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
