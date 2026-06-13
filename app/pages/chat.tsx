import { useState, useRef, useEffect, useCallback } from "react";
import { Form, useFetcher } from "react-router";
import { invokeLLM } from "@qb/agentic";
import { useAuth } from "~/modules/authentication";
import { useConfigurables } from "~/modules/configurables";
import { cn } from "~/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  error?: boolean;
}

// ─── Markdown-ish renderer ────────────────────────────────────────────────────
// Simple client-side renderer for code blocks, bold, and inline code.

function renderContent(content: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Split by code blocks first
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before) parts.push(<span key={key++}>{renderInline(before)}</span>);

    const lang = match[1] || "text";
    const code = match[2].trim();
    parts.push(
      <CodeBlock key={key++} lang={lang} code={code} />
    );
    lastIndex = match.index + match[0].length;
  }

  const remaining = content.slice(lastIndex);
  if (remaining) parts.push(<span key={key++}>{renderInline(remaining)}</span>);

  return parts.length ? <>{parts}</> : renderInline(content);
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;
  // inline code
  const inlineCodeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) parts.push(<span key={key++}>{renderBold(before)}</span>);
    parts.push(
      <code key={key++} className="px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#333] text-[#00c8ff] text-sm font-mono">
        {match[1]}
      </code>
    );
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) parts.push(<span key={key++}>{renderBold(remaining)}</span>);

  if (parts.length === 0) return renderBold(text);
  return <>{parts}</>;
}

function renderBold(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldRegex.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index);
    if (before) parts.push(<span key={key++}>{renderLineBreaks(before)}</span>);
    parts.push(<strong key={key++} className="font-semibold text-white">{match[1]}</strong>);
    lastIndex = match.index + match[0].length;
  }

  const remaining = text.slice(lastIndex);
  if (remaining) parts.push(<span key={key++}>{renderLineBreaks(remaining)}</span>);

  if (parts.length === 0) return renderLineBreaks(text);
  return <>{parts}</>;
}

function renderLineBreaks(text: string): React.ReactNode {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {line}
          {i < lines.length - 1 && <br />}
        </span>
      ))}
    </>
  );
}

// ─── CodeBlock ────────────────────────────────────────────────────────────────

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[#2a2a2a]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161616] border-b border-[#2a2a2a]">
        <span className="text-xs text-[#888] font-mono uppercase tracking-wide">{lang || "code"}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-[#888] hover:text-[#00c8ff] transition-colors duration-150 font-mono"
        >
          {copied ? "copied!" : "copy"}
        </button>
      </div>
      <pre className="p-4 bg-[#0f0f0f] overflow-x-auto m-0 border-0 rounded-none">
        <code className="text-sm text-[#e4e4e4] font-mono leading-relaxed whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#888]" />
      <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#888]" />
      <div className="typing-dot w-1.5 h-1.5 rounded-full bg-[#888]" />
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex message-in", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          <span className="text-[10px] font-bold text-[#00c8ff]">K</span>
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-[#00c8ff] text-[#0d0d0d] rounded-tr-sm font-medium"
            : message.error
              ? "bg-[#1a1a1a] border border-[#ef4444]/30 text-[#ef4444] rounded-tl-sm"
              : "bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] rounded-tl-sm"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose-chat">{renderContent(message.content)}</div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center ml-2 mt-1 flex-shrink-0">
          <span className="text-[10px] text-[#888]">you</span>
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  open,
  onClose,
  onNewChat,
  appName,
  logoUrl,
  username,
}: {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  appName: string;
  logoUrl: string;
  username: string;
}) {
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-[#111111] border-r border-[#2a2a2a] z-50 flex flex-col transition-transform duration-200",
          "lg:relative lg:translate-x-0 lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-[#2a2a2a]">
          {logoUrl && logoUrl !== "FILL_LOGO_URL_HERE" ? (
            <img src={logoUrl} alt={appName} className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#00c8ff] flex items-center justify-center">
              <span className="text-[11px] font-black text-[#0d0d0d]">K</span>
            </div>
          )}
          <span className="font-bold text-base text-white tracking-tight">{appName}</span>
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#888] hover:text-white hover:bg-[#1e1e1e] transition-colors duration-150 border border-[#2a2a2a] hover:border-[#333]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User + logout */}
        <div className="px-3 pb-4 border-t border-[#2a2a2a] pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
            <div className="w-6 h-6 rounded-full bg-[#2a2a2a] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px] text-[#888] uppercase">{username?.[0] ?? "?"}</span>
            </div>
            <span className="text-sm text-[#aaa] truncate flex-1">{username}</span>
            <Form method="post" action="/auth/logout">
              <button
                type="submit"
                className="text-[#555] hover:text-[#ef4444] transition-colors duration-150"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </Form>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeScreen({
  appName,
  welcomeMessage,
  logoUrl,
  onSuggestion,
}: {
  appName: string;
  welcomeMessage: string;
  logoUrl: string;
  onSuggestion: (text: string) => void;
}) {
  const suggestions = [
    "Explain how async/await works in JavaScript",
    "Help me write a Python function to parse CSV files",
    "What are the best practices for REST API design?",
    "Debug this: why would a React component re-render infinitely?",
  ];

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
      {/* Logo */}
      <div className="mb-6">
        {logoUrl && logoUrl !== "FILL_LOGO_URL_HERE" ? (
          <img src={logoUrl} alt={appName} className="w-14 h-14 rounded-2xl object-cover mx-auto" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00c8ff] to-[#3b82f6] flex items-center justify-center mx-auto shadow-lg shadow-[#00c8ff]/20">
            <span className="text-xl font-black text-[#0d0d0d]">K</span>
          </div>
        )}
      </div>

      <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">{appName}</h1>
      <p className="text-[#888] text-sm max-w-sm leading-relaxed mb-10">
        {welcomeMessage}
      </p>

      {/* Suggestion chips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="text-left text-xs text-[#aaa] bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#00c8ff]/40 hover:text-white rounded-xl px-4 py-3 transition-all duration-150 leading-relaxed"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main ChatPage ────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { user } = useAuth();
  const { config, loading: configLoading } = useConfigurables();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const appName = config?.appName || "KYYXBOT";
  const logoUrl = config?.logoUrl || "";
  const welcomeMessage = config?.welcomeMessage || "Ask me anything.";
  const chatPlaceholder = config?.chatPlaceholder || "Ask anything...";
  const systemPrompt = config?.systemPrompt || "You are KYYXBOT, a sharp and helpful private AI assistant.";

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Build conversation history context for the LLM
    const historyContext = messages
      .slice(-10) // last 10 messages for context window
      .map((m) => `${m.role === "user" ? "Human" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const fullMessage = historyContext
      ? `${historyContext}\n\nHuman: ${content}`
      : content;

    try {
      const result = await invokeLLM({
        message: fullMessage,
        systemPrompt,
        schema: {
          type: "object",
          properties: {
            reply: {
              type: "string",
              description: "Your response to the user",
            },
          },
          required: ["reply"],
        },
      });

      const reply =
        (result?.response?.reply as string) ||
        "I'm sorry, I couldn't generate a response. Please try again.";

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: err?.message?.includes("Failed to invoke LLM")
          ? "I ran into an issue connecting to the AI. Make sure the API key is configured."
          : `Something went wrong: ${err?.message ?? "Unknown error"}`,
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, messages, isLoading, systemPrompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0d0d0d]">
        <div className="flex gap-1">
          <div className="typing-dot w-2 h-2 rounded-full bg-[#00c8ff]" />
          <div className="typing-dot w-2 h-2 rounded-full bg-[#00c8ff]" />
          <div className="typing-dot w-2 h-2 rounded-full bg-[#00c8ff]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d0d0d]">
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        appName={appName}
        logoUrl={logoUrl}
        username={user?.username ?? "friend"}
      />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e1e] bg-[#0d0d0d] flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-[#555] hover:text-white hover:bg-[#1e1e1e] transition-colors lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Desktop: new chat button */}
          <button
            onClick={handleNewChat}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#888] hover:text-white hover:bg-[#1e1e1e] transition-colors border border-[#2a2a2a] hover:border-[#333]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New chat
          </button>

          <div className="flex-1" />

          {/* App name / brand center */}
          <div className="flex items-center gap-2">
            {logoUrl && logoUrl !== "FILL_LOGO_URL_HERE" ? (
              <img src={logoUrl} alt={appName} className="w-5 h-5 rounded object-cover" />
            ) : (
              <div className="w-5 h-5 rounded bg-[#00c8ff] flex items-center justify-center">
                <span className="text-[8px] font-black text-[#0d0d0d]">K</span>
              </div>
            )}
            <span className="text-sm font-semibold text-[#aaa] tracking-tight">{appName}</span>
          </div>

          <div className="flex-1" />

          {/* Desktop: user + logout */}
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-xs text-[#555]">{user?.username}</span>
            <Form method="post" action="/auth/logout">
              <button
                type="submit"
                className="p-1.5 rounded-lg text-[#555] hover:text-[#ef4444] hover:bg-[#1e1e1e] transition-colors"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </Form>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <WelcomeScreen
              appName={appName}
              welcomeMessage={welcomeMessage}
              logoUrl={logoUrl}
              onSuggestion={(text) => {
                setInput(text);
                handleSend(text);
              }}
            />
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-start message-in">
                  <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                    <span className="text-[10px] font-bold text-[#00c8ff]">K</span>
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl rounded-tl-sm">
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex-shrink-0 border-t border-[#1e1e1e] bg-[#0d0d0d] px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl px-4 py-3 focus-within:border-[#00c8ff]/50 transition-colors duration-150">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={chatPlaceholder}
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent text-sm text-white placeholder-[#555] resize-none outline-none min-h-[24px] max-h-[160px] leading-relaxed disabled:opacity-50"
                style={{ height: "24px" }}
                autoFocus
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150",
                  input.trim() && !isLoading
                    ? "bg-[#00c8ff] text-[#0d0d0d] hover:bg-[#00b4e8] shadow-sm shadow-[#00c8ff]/30"
                    : "bg-[#2a2a2a] text-[#555] cursor-not-allowed"
                )}
                aria-label="Send message"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <p className="text-center text-[10px] text-[#333] mt-2">
              Enter to send &middot; Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
