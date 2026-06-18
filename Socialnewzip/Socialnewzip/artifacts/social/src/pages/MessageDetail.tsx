import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, Image, Smile, Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTimeAgo } from "@/data/mockData";
import { useSocial } from "@/context/SocialContext";

export default function MessageDetail() {
  const params = useParams<{ conversationId: string }>();
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const convId = params.conversationId ?? "";

  const { conversations, getConversationMessages, getUserById, sendMessage, markConversationRead } = useSocial();

  const conv = conversations.find(c => c.id === convId);
  const otherId = conv?.participantIds.find(id => id !== "me") ?? "";
  const other = getUserById(otherId);
  const messages = getConversationMessages(convId);

  // Mark as read when opened
  useEffect(() => {
    markConversationRead(convId);
  }, [convId]);

  // Simulate other user "typing" after we send a message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    sendMessage(convId, input.trim());
    setInput("");
    // Simulate typing indicator after user sends
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2500);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-40 shrink-0">
        <button
          onClick={() => setLocation("/messages")}
          className="text-muted-foreground hover:text-foreground p-1"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {other && (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarImage src={other.avatarUrl} />
                <AvatarFallback>{other.displayName[0]}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{other.displayName}</p>
              <p className="text-xs text-green-500">online</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" style={{ scrollbarWidth: "thin" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-sm">Nenhuma mensagem ainda.</p>
            <p className="text-xs mt-1 opacity-70">Diga oi! 👋</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === "me";
            const showAvatar = !isMe && (i === 0 || messages[i - 1]?.senderId !== msg.senderId);
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                data-testid={`message-${msg.id}`}
              >
                {!isMe && (
                  <div className="w-7 h-7 shrink-0 mb-0.5">
                    {showAvatar && (
                      <Avatar className="w-7 h-7">
                        <AvatarImage src={other?.avatarUrl} />
                        <AvatarFallback>{other?.displayName?.[0]}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}
                <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm"
                }`}>
                  <p className="leading-relaxed">{msg.content}</p>
                  <div className={`flex items-center gap-1 mt-1 ${isMe ? "justify-end" : ""}`}>
                    <span className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatTimeAgo(msg.createdAt)}
                    </span>
                    {isMe && (
                      msg.isRead
                        ? <CheckCheck className="w-3 h-3 text-primary-foreground/60" />
                        : <Check className="w-3 h-3 text-primary-foreground/60" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex items-end gap-2"
            >
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={other?.avatarUrl} />
                <AvatarFallback>{other?.displayName?.[0]}</AvatarFallback>
              </Avatar>
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 bg-muted-foreground rounded-full"
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3 bg-background flex items-end gap-2 shrink-0">
        <button className="text-muted-foreground hover:text-primary p-1 transition-colors" data-testid="button-attach-image">
          <Image className="w-5 h-5" />
        </button>
        <button className="text-muted-foreground hover:text-primary p-1 transition-colors" data-testid="button-emoji">
          <Smile className="w-5 h-5" />
        </button>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Escreva uma mensagem..."
          rows={1}
          data-testid="input-message"
          className="flex-1 bg-muted/50 rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-primary focus:outline-none resize-none max-h-32"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!input.trim()}
          data-testid="button-send"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity shrink-0"
        >
          <Send className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  );
}
