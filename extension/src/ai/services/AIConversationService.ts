/* ─────────────────────────────────────────────
 *  AI Conversation Service
 *
 *  Manages multi-conversation chat threads, message histories,
 *  renaming, deletion, and local persistence.
 * ───────────────────────────────────────────── */

import type { AIConversation, AIMessage } from "@mapmyserver/shared";

const STORAGE_KEY_PREFIX = "ai_conversations:";

export class AIConversationService {
  static async loadConversations(serverId: string): Promise<AIConversation[]> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const key = `${STORAGE_KEY_PREFIX}${serverId}`;
      const res = await chrome.storage.local.get(key);
      return (res[key] as AIConversation[]) || [];
    }
    return [];
  }

  static async saveConversations(serverId: string, convs: AIConversation[]): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const key = `${STORAGE_KEY_PREFIX}${serverId}`;
      await chrome.storage.local.set({ [key]: convs });
    }
  }

  static async createConversation(serverId: string, title?: string): Promise<AIConversation> {
    const convs = await this.loadConversations(serverId);
    const newConv: AIConversation = {
      id: `conv-${serverId}-${Date.now()}`,
      serverId,
      title: title || `Chat #${convs.length + 1}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    convs.unshift(newConv);
    await this.saveConversations(serverId, convs);
    return newConv;
  }

  static async addMessage(
    serverId: string,
    convId: string,
    message: AIMessage
  ): Promise<AIConversation | null> {
    const convs = await this.loadConversations(serverId);
    const target = convs.find((c) => c.id === convId);
    if (!target) return null;

    target.messages.push(message);
    target.updatedAt = Date.now();

    // Auto-title from first user message if default title
    if (target.messages.length === 1 && message.role === "user") {
      target.title = message.content.slice(0, 32).trim() + "...";
    }

    await this.saveConversations(serverId, convs);
    return target;
  }

  static async renameConversation(
    serverId: string,
    convId: string,
    newTitle: string
  ): Promise<void> {
    const convs = await this.loadConversations(serverId);
    const target = convs.find((c) => c.id === convId);
    if (target) {
      target.title = newTitle;
      target.updatedAt = Date.now();
      await this.saveConversations(serverId, convs);
    }
  }

  static async deleteConversation(serverId: string, convId: string): Promise<void> {
    const convs = await this.loadConversations(serverId);
    const filtered = convs.filter((c) => c.id !== convId);
    await this.saveConversations(serverId, filtered);
  }
}

