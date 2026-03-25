"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Sparkles, FileText, Copy, Check, RefreshCw, Bot, User, MessageSquare, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { BASE_URL } from "@/lib/api-config"

interface Message {
  id: string
  type: "user" | "assistant"
  content: string
  sources?: {
    clause: string
    section: string
    text: string
  }[]
  timestamp: Date
}

const suggestedQuestions = [
  "What are the payment terms?",
  "What are the termination conditions?",
  "Are there liability limitations?",
  "What are the confidentiality obligations?",
  "When does this contract expire?",
  "What are the renewal terms?",
]

export default function SmartSearchPage() {
  const [selectedContract, setSelectedContract] = useState("all")
  const [availableContracts, setAvailableContracts] = useState<{id: string, name: string}[]>([
    { id: "all", name: "All Contracts" }
  ])
  const [query, setQuery] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${BASE_URL}/contracts`)
      .then(res => res.json())
      .then(data => {
        const mapped = data.map((c: any) => ({ id: c.id, name: c.name || c.id }))
        setAvailableContracts([{ id: "all", name: "All Contracts" }, ...mapped])
      })
      .catch(err => console.error("Failed to load contracts for search", err))
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSubmit = async (questionOverride?: string) => {
    const question = questionOverride || query
    if (!question.trim()) return

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: question,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setQuery("")
    setIsLoading(true)

    try {
      const res = await fetch(`${BASE_URL}/contracts/${selectedContract}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      })
      
      const data = await res.json()
      
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-assistant`,
        type: "assistant",
        content: data.response || "No response received.",
        sources: data.sources?.map((s: any) => ({
          clause: "Source Document",
          section: s.section || "Page N/A",
          text: s.text || ""
        })) || [],
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error(err)
      setMessages((prev) => [...prev, {
        id: `msg-${Date.now()}-error`,
        type: "assistant",
        content: "An error occurred while communicating with the AI. Ensure the backend and Ollama are running.",
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 bg-background/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Smart Search</h1>
            <p className="text-xs text-muted-foreground">
              AI-powered contract intelligence
            </p>
          </div>
        </div>
        <Select value={selectedContract} onValueChange={setSelectedContract}>
          <SelectTrigger className="w-56 border-border/50 bg-secondary/50">
            <FileText className="mr-2 size-4 text-muted-foreground" />
            <SelectValue placeholder="Select contract" />
          </SelectTrigger>
          <SelectContent>
            {availableContracts.map((contract) => (
              <SelectItem key={contract.id} value={contract.id}>
                {contract.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-2xl space-y-10 py-16">
              {/* Hero */}
              <div className="text-center">
                <div className="relative mx-auto mb-6 flex size-20 items-center justify-center">
                  <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
                  <div className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-xl shadow-primary/30">
                    <Sparkles className="size-8 text-primary-foreground" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Ask anything about your contracts</h2>
                <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                  Get instant, AI-powered answers from your contract documents with source citations
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="space-y-4">
                <p className="text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Try asking
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedQuestions.map((question) => (
                    <Button
                      key={question}
                      variant="outline"
                      size="sm"
                      className="group h-auto gap-1.5 px-3 py-2 text-sm transition-all hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => handleSubmit(question)}
                    >
                      {question}
                      <ArrowRight className="size-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.type === "user" && "justify-end"
                  )}
                >
                  {message.type === "assistant" && (
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                      <Bot className="size-5 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] space-y-4",
                      message.type === "user" &&
                        "rounded-2xl bg-primary px-4 py-3 text-primary-foreground shadow-lg shadow-primary/20"
                    )}
                  >
                    <div className={cn(
                      "text-sm leading-relaxed",
                      message.type === "assistant" && "prose prose-sm max-w-none dark:prose-invert"
                    )}>
                      {message.content.split("\n").map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0">
                          {line}
                        </p>
                      ))}
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="space-y-2 border-t border-border/50 pt-4">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <FileText className="size-3" />
                          Sources
                        </p>
                        {message.sources.map((source, idx) => (
                          <Card key={idx} className="border-border/50 bg-secondary/30">
                            <CardContent className="p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium">
                                    {source.clause}
                                  </span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {source.section}
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={() =>
                                    copyToClipboard(source.text, `${message.id}-${idx}`)
                                  }
                                >
                                  {copiedId === `${message.id}-${idx}` ? (
                                    <Check className="size-3 text-success" />
                                  ) : (
                                    <Copy className="size-3" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {source.text}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                  {message.type === "user" && (
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      <User className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <RefreshCw className="size-4 animate-spin text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5 rounded-xl bg-secondary/50 px-4 py-3">
                    <span className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:0ms]" />
                    <span className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:150ms]" />
                    <span className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border/50 bg-background/80 p-4 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl">
            <div className="relative">
              <Textarea
                placeholder="Ask about your contracts..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
                className="min-h-[52px] resize-none rounded-xl border-border/50 bg-secondary/50 py-3.5 pr-14 text-sm placeholder:text-muted-foreground/60"
                rows={1}
              />
              <Button
                size="icon"
                onClick={() => handleSubmit()}
                disabled={!query.trim() || isLoading}
                className="absolute bottom-2 right-2 size-9 rounded-lg shadow-lg shadow-primary/25"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground/60">
              AI responses are generated based on contract documents. Always verify critical information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
