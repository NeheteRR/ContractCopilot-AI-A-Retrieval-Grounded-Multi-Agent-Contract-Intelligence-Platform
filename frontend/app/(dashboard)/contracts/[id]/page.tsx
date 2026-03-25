"use client"

import { useState, useRef, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, FileText, Search, MessageSquare, Send, Bot, User, Sparkles, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { BASE_URL } from "@/lib/api-config"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  sources?: { clause: string; section: string }[]
}

const suggestedQuestions = [
  "What are the payment terms in this contract?",
  "What are the main risks I should be aware of?",
  "When is the contract renewal deadline?",
  "What happens if we breach the confidentiality clause?",
  "Summarize the limitation of liability section",
]

export default function ContractViewerPage() {
  const params = useParams()
  const contractId = params.id as string
  
  const [contractData, setContractData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>("pending")
  const [progress, setProgress] = useState(0)
  const [timedOut, setTimedOut] = useState(false)
  const [selectedClause, setSelectedClause] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    let timeoutHandle: NodeJS.Timeout

    const stopLoading = () => {
      clearInterval(interval)
      clearTimeout(timeoutHandle)
      setLoading(false)
    }

    const fetchContract = async () => {
      try {
        // Try with encoded ID first, then raw ID
        const encoded = encodeURIComponent(contractId)
        let res = await fetch(`${BASE_URL}/contracts/${encoded}`)
        if (!res.ok && encoded !== contractId) {
          res = await fetch(`${BASE_URL}/contracts/${contractId}`)
        }
        if (res.ok) {
          const data = await res.json()
          setContractData(data)
          setStatus("completed")
          stopLoading()
        } else if (res.status === 404) {
          fetchStatus()
        } else {
          stopLoading()
        }
      } catch (err) {
        console.error("Failed to fetch contract details:", err)
        stopLoading()
      }
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${BASE_URL}/contracts/${encodeURIComponent(contractId)}/status`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data.status)
          setProgress(data.progress)
          if (data.status === "completed") {
            fetchContract()
          } else if (data.status === "not_found") {
            // Contract truly doesn't exist — stop spinning
            stopLoading()
          }
        } else {
          stopLoading()
        }
      } catch (err) {
        console.error("Failed to fetch status:", err)
        stopLoading()
      }
    }

    if (contractId) {
      fetchContract()
      interval = setInterval(() => {
        if (status !== "completed" && status !== "not_found") {
          fetchContract()
        }
      }, 3000)
      // Hard timeout: give up after 45 seconds
      timeoutHandle = setTimeout(() => {
        setTimedOut(true)
        stopLoading()
      }, 45000)
    }

    return () => {
      clearInterval(interval)
      clearTimeout(timeoutHandle)
    }
  }, [contractId, status])

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
    }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput("")
    setIsTyping(true)

    try {
      const response = await fetch(`${BASE_URL}/contracts/${contractId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) throw new Error("Chat failed")
      
      const data = await response.json()
      
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: data.response,
        sources: data.sources,
      }
      setChatMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error("Chat error:", err)
      setChatMessages((prev) => [...prev, {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "Sorry, I'm having trouble connecting to the AI brain right now. Please make sure the backend is running and Ollama is active.",
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const getRiskBadge = (level: string) => {
    const l = level?.toLowerCase() || "low"
    if (l === "high") return "bg-destructive/10 text-destructive"
    if (l === "medium") return "bg-warning/10 text-warning"
    return "bg-success/10 text-success"
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Loading contract data...</p>
          {progress > 0 && <p className="mt-1 text-xs text-muted-foreground">{progress}% complete</p>}
        </div>
      </div>
    )
  }

  if (!contractData) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center text-center">
        <div className="space-y-3">
          <p className="text-lg font-semibold">Contract not found</p>
          <p className="text-sm text-muted-foreground">
            {timedOut
              ? "The analysis is taking too long. Please try again or re-upload the contract."
              : `No data found for contract ID: "${contractId}"`}
          </p>
          <Button asChild variant="outline">
            <Link href="/contracts">← Back to Contracts</Link>
          </Button>
        </div>
      </div>
    )
  }

  const clauses = contractData.clauses || []
  const obligations = contractData.obligations || []
  const risks = contractData.risks || []

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contracts">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{contractId}.pdf</h1>
            <p className="text-sm text-muted-foreground">{contractId} | Status: Completed</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs">
          {contractId}
        </Badge>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
        {/* Document Panel - Showing Page Images if available, else text */}
        <div className="flex flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-medium">Document Preview</h2>
            <div className="relative w-48">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search document..."
                className="h-8 pl-9 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-6">
               {/* Display page 1 by default if available */}
               <div className="mx-auto max-w-lg space-y-4 rounded-lg border border-border bg-card p-4 shadow-sm">
                 <img 
                   src={`${BASE_URL}/output/contract_images/${contractId}/page_1.png`} 
                   alt="Contract Page 1"
                   className="w-full rounded border"
                   onError={(e) => {
                     (e.target as any).style.display = 'none';
                     (e.target as any).nextSibling.style.display = 'block';
                   }}
                 />
                 <div style={{display: 'none'}} className="p-4 text-xs text-muted-foreground">
                    Image preview not available. Showing extracted text snippet:
                    <div className="mt-2 rounded bg-secondary p-2 whitespace-pre-wrap italic">
                      {clauses[0]?.text || "No clauses available."}
                    </div>
                 </div>
               </div>
            </div>
          </ScrollArea>
        </div>

        {/* Analysis Panel */}
        <div className="flex flex-col overflow-hidden">
          <Tabs defaultValue="clauses" className="flex flex-1 flex-col">
            <div className="border-b border-border px-4 py-2">
              <TabsList>
                <TabsTrigger value="chat">
                  <MessageSquare className="mr-1.5 size-3.5" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="clauses">Clauses ({clauses.length})</TabsTrigger>
                <TabsTrigger value="obligations">Obligations ({obligations.length})</TabsTrigger>
                <TabsTrigger value="risks">Risks ({risks.length})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="chat" className="mt-0 flex flex-1 flex-col overflow-hidden">
              <div className="flex flex-1 flex-col">
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4">
                  {chatMessages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="size-6 text-primary" />
                      </div>
                      <h3 className="mb-2 text-sm font-medium">Ask about this contract</h3>
                      <p className="mb-6 max-w-xs text-xs text-muted-foreground">
                        Get instant answers about clauses, obligations, risks, and terms
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                        >
                          {message.role === "assistant" && (
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                              <Bot className="size-4 text-primary" />
                            </div>
                          )}
                          <div className={cn("max-w-[85%] rounded-lg px-3 py-2 text-sm", message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                            <p className="whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="border-t border-border p-4">
                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(chatInput); }} className="flex gap-2">
                    <Input placeholder="Ask a question..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1" />
                    <Button type="submit" size="icon" disabled={!chatInput.trim() || isTyping}><Send className="size-4" /></Button>
                  </form>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="clauses" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-3 p-4">
                  {clauses.map((clause: any, i: number) => (
                    <Card key={i} className={cn("cursor-pointer transition-all hover:shadow-md", selectedClause === i.toString() && "ring-2 ring-primary")}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium">{clause.type}</CardTitle>
                          <Badge variant="outline">{clause.source}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent><p className="text-xs text-muted-foreground line-clamp-3">{clause.text}</p></CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="obligations" className="mt-0 flex-1 overflow-hidden">
               <ScrollArea className="h-full">
                <div className="space-y-3 p-4">
                  {obligations.map((ob: any, i: number) => (
                    <Card key={i}>
                      <CardHeader className="pb-2">
                         <div className="flex items-start justify-between">
                           <CardTitle className="text-sm font-medium">{ob.action_required}</CardTitle>
                           <Badge variant="secondary" className="text-[10px]">{ob.risk_level}</Badge>
                         </div>
                         <p className="text-[10px] text-muted-foreground">Responsible: {ob.responsible_party} | Due: {ob.deadline?.raw || 'N/A'}</p>
                      </CardHeader>
                      <CardContent><p className="text-xs text-muted-foreground italic">&quot;{ob.source_clause}&quot;</p></CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="risks" className="mt-0 flex-1 overflow-hidden">
               <ScrollArea className="h-full">
                <div className="space-y-3 p-4">
                  {risks.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground p-8">No high risks identified.</p>
                  ) : (
                    risks.map((risk: any, i: number) => (
                      <Card key={i} className="border-l-4 border-l-destructive">
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-medium">{risk.title || "Risk Item"}</CardTitle>
                            <Badge variant="destructive">{risk.severity || "High"}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent><p className="text-xs text-muted-foreground">{risk.description}</p></CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
