"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./AriaWidget.module.css";

interface AriaMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  isError?: boolean;
}

const INTRO_MESSAGE = `Hello, I'm ARIA — Alpha Brooks Real-time Intelligence Assistant.

I'm the AI operations assistant for Alpha Brooks Energy LTD's CNG operations. I can help you understand the current project position, monitor task progress, identify pending and overdue work, and provide concise operational insights.

You can ask me things like:
- Where are we?
- What have we completed?
- What is overdue?
- What needs management attention?

I use the available project data to answer — nothing invented.`;

function createMessage(role: AriaMessage["role"], content: string, isError = false): AriaMessage {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, role, content, isError };
}

export function AriaWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AriaMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show the introduction the first time the panel is opened, not before.
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([createMessage("assistant", INTRO_MESSAGE)]);
    }
  }, [open, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, createMessage("user", question)]);
    setInput("");
    setLoading(true);

        try {
      const res = await fetch("/api/aria/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: question,
          history: messages
            .filter((m) => !m.isError)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: { reply: string } = await res.json();
      setMessages((prev) => [...prev, createMessage("assistant", data.reply)]);
    } catch {
      setMessages((prev) => [
        ...prev,
        createMessage("assistant", "I couldn't process that just now. Please try again.", true),
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <button
        className={styles.launcher}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close ARIA" : "Open ARIA"}
        aria-expanded={open}
      >
        {open ? "×" : "ARIA"}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="ARIA assistant">
          <div className={styles.header}>
            <div>
              <div className={styles.headerTitle}>ARIA</div>
              <div className={styles.headerSubtitle}>Alpha Brooks Real-time Intelligence Assistant</div>
            </div>
            <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close">
              ×
            </button>
          </div>

          <div className={styles.messages} ref={scrollRef}>
            {messages.length === 0 ? (
              <div className={styles.empty}>Ask ARIA about current CNG project status.</div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`${styles.message} ${m.role === "user" ? styles.messageUser : styles.messageAssistant} ${
                    m.isError ? styles.messageError : ""
                  }`}
                >
                  {m.content}
                </div>
              ))
            )}

            {loading && (
              <div className={`${styles.message} ${styles.messageAssistant} ${styles.messageLoading}`}>
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </div>
            )}
          </div>

          <div className={styles.inputRow}>
            <textarea
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask ARIA about the CNG project…"
              rows={1}
              disabled={loading}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}