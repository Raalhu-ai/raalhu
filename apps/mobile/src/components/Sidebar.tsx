import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  TextInput,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect, Circle, Line, Polyline } from "react-native-svg";
import { modelDisplayName } from "@raalhu/shared";
import type { User, QuotaModel } from "../api";

export interface ChatSession {
  id: string;
  title: string;
}

type NavTab = "chat" | "projects" | "artifacts";

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  sessions: ChatSession[];
  activeSessionId: string | null;
  quotas: QuotaModel[];
  quotaLoading: boolean;
  selectedModel: string;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onSettings: () => void;
  onLogout: () => void;
  onRefreshQuota: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onRenameSession?: (id: string, title: string) => void;
  onArchiveSession?: (id: string) => void;
}

function quotaPct(q: QuotaModel): number {
  return (q.remainingFraction ?? 0) * 100;
}

function quotaBarColor(pct: number): string {
  if (pct > 40) return "rgb(125,159,227)";
  if (pct > 15) return "rgb(234,179,8)";
  return "rgb(229,77,46)";
}

export default function Sidebar({
  visible,
  onClose,
  user,
  sessions,
  activeSessionId,
  quotas,
  quotaLoading,
  selectedModel,
  onSelectSession,
  onNewChat,
  onSettings,
  onLogout,
  onRefreshQuota,
  activeTab,
  onTabChange,
  onRenameSession,
  onArchiveSession,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const selectedQuota = quotas.find((q) => q.modelId === selectedModel);
  const selectedPct = selectedQuota ? quotaPct(selectedQuota) : 0;

  function startRename(session: ChatSession) {
    setRenamingId(session.id);
    setRenameValue(session.title);
    setMenuOpenId(null);
  }

  function submitRename() {
    if (renamingId && renameValue.trim() && onRenameSession) {
      onRenameSession(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 flex-row" onPress={onClose}>
        {/* Sidebar panel */}
        <Pressable
          className="w-72 bg-card h-full"
          onPress={() => {}}
        >
          <SafeAreaView className="flex-1">
            <View className="p-3 flex-1 gap-3">
              {/* Branding */}
              <View className="flex-row items-center gap-3 px-2">
                <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="rgb(125,159,227)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                  <Path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                  <Path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                </Svg>
                <Text
                  className="text-5xl text-primary"
                  style={{ fontFamily: "Sangu Suruhee", lineHeight: 60, writingDirection: "rtl" }}
                >
                  ރާޅު
                </Text>
                <View className="flex-1" />
                <Pressable onPress={onClose} className="p-1.5 rounded-md active:bg-accent">
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgb(156,163,175)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M18 6 6 18M6 6l12 12" />
                  </Svg>
                </Pressable>
              </View>

              {/* New Chat */}
              <Pressable
                onPress={() => { onNewChat(); onClose(); }}
                className="flex-row items-center gap-2 px-2 py-2 rounded-lg active:bg-accent"
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgb(232,234,237)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M5 12h14M12 5v14" />
                </Svg>
                <Text
                  className="text-sm text-foreground"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                >
                  އައު ޗެޓް
                </Text>
              </Pressable>

              {/* Navigation tabs */}
              <View className="gap-0.5">
                {[
                  { tab: "chat" as NavTab, label: "ޗެޓް" },
                  { tab: "projects" as NavTab, label: "ޕްރޮޖެކްޓް" },
                  { tab: "artifacts" as NavTab, label: "އާޓިފެކްޓް" },
                ].map(({ tab, label }) => (
                  <Pressable
                    key={tab}
                    onPress={() => { onTabChange(tab); onClose(); }}
                    className={`flex-row items-center gap-2 px-2 py-1.5 rounded-lg ${
                      activeTab === tab ? "bg-accent" : "active:bg-accent/50"
                    }`}
                  >
                    <Text
                      className={`text-sm ${activeTab === tab ? "text-foreground" : "text-muted-foreground"}`}
                      style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View className="h-px bg-border" />

              {/* Chat History */}
              <View className="flex-1">
                <Text
                  className="text-muted-foreground text-xs font-semibold uppercase tracking-wider mb-1.5 px-2"
                  style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                >
                  ޗެޓް ހިސްޓްރީ
                </Text>

                {sessions.length === 0 ? (
                  <View className="flex-1 items-center justify-center gap-3">
                    <Svg width={56} height={56} viewBox="0 0 24 24" fill="none" stroke="rgba(156,163,175,0.2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M3 6V5a2 2 0 0 1 2-2h2M11 3h3M18 3h1a2 2 0 0 1 2 2M21 9v2M21 15a2 2 0 0 1-1 1.73M14 21H7l-4 4V16M3 12v-2" />
                    </Svg>
                    <Text
                      className="text-base text-muted-foreground/50"
                      style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                    >
                      ޗެޓް ތައް
                    </Text>
                  </View>
                ) : (
                  <ScrollView className="flex-1">
                    {sessions.map((session) => (
                      <View key={session.id}>
                        {renamingId === session.id ? (
                          <View className="px-2 py-1.5">
                            <TextInput
                              value={renameValue}
                              onChangeText={setRenameValue}
                              onSubmitEditing={submitRename}
                              onBlur={submitRename}
                              autoFocus
                              className="px-1.5 py-0.5 text-xs bg-background border border-border rounded text-foreground"
                              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                            />
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => { onSelectSession(session.id); onClose(); }}
                            onLongPress={() => setMenuOpenId(menuOpenId === session.id ? null : session.id)}
                            className={`flex-row items-center gap-1 px-2 py-1.5 rounded-lg ${
                              activeSessionId === session.id ? "bg-accent" : "active:bg-accent/50"
                            }`}
                          >
                            <Text
                              className="text-sm text-foreground flex-1"
                              style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                              numberOfLines={1}
                            >
                              {session.title}
                            </Text>
                          </Pressable>
                        )}

                        {/* Context menu on long press */}
                        {menuOpenId === session.id && (
                          <View className="mx-2 mb-1 bg-popover border border-border rounded-lg py-1">
                            <Pressable
                              onPress={() => startRename(session)}
                              className="flex-row items-center gap-2 px-3 py-1.5 active:bg-accent"
                            >
                              <Text
                                className="text-xs text-foreground"
                                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                              >
                                ނަން ބަދަލުކުރޭ
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => { onArchiveSession?.(session.id); setMenuOpenId(null); }}
                              className="flex-row items-center gap-2 px-3 py-1.5 active:bg-accent"
                            >
                              <Text
                                className="text-xs text-destructive"
                                style={{ fontFamily: "MV Typewriter", writingDirection: "rtl" }}
                              >
                                އާކައިވް
                              </Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Bottom: Quota + User */}
              <View className="gap-3 border-t border-border pt-3 px-2">
                {/* Quota bar */}
                <View>
                  <View className="flex-row items-center gap-2">
                    <View className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: `${selectedPct}%`,
                          backgroundColor: quotaBarColor(selectedPct),
                        }}
                      />
                    </View>
                    <Text className="text-muted-foreground text-xs font-medium">
                      {Math.round(selectedPct)}%
                    </Text>
                  </View>
                </View>

                {/* User */}
                {user ? (
                  <View className="flex-row items-center gap-3">
                    {user.picture ? (
                      <Image
                        source={{ uri: user.picture }}
                        className="w-7 h-7 rounded-full"
                      />
                    ) : null}
                    <View className="flex-1">
                      <Text className="text-xs text-foreground font-medium" numberOfLines={1}>{user.name}</Text>
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>{user.email}</Text>
                    </View>
                    <Pressable
                      onPress={() => { onSettings(); onClose(); }}
                      className="p-1.5 rounded-md active:bg-accent"
                    >
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgb(156,163,175)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                        <Circle cx={12} cy={12} r={3} />
                      </Svg>
                    </Pressable>
                    <Pressable
                      onPress={onLogout}
                      className="p-1.5 rounded-md active:bg-accent"
                    >
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgb(156,163,175)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <Polyline points="16 17 21 12 16 7" />
                        <Line x1={21} x2={9} y1={12} y2={12} />
                      </Svg>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          </SafeAreaView>
        </Pressable>

        {/* Backdrop */}
        <View className="flex-1 bg-black/50" />
      </Pressable>
    </Modal>
  );
}
