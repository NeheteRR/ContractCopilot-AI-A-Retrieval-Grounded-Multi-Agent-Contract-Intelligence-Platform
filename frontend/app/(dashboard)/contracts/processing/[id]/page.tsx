"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Check, Loader2, Circle, FileText, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { BASE_URL } from "@/lib/api-config"

type StepStatus = "completed" | "in-progress" | "pending" | "failed"

interface ProcessingStep {
  id: string
  title: string
  description: string
  status: StepStatus
}

export default function ProcessingPage() {
  const router = useRouter()
  const { id } = useParams()
  const [progress, setProgress] = useState(20)
  const [status, setStatus] = useState<string>("uploaded")
  const [error, setError] = useState<string | null>(null)

  const steps: ProcessingStep[] = [
    {
      id: "upload",
      title: "Upload",
      description: "Document received and validated",
      status: progress >= 20 ? "completed" : "in-progress",
    },
    {
      id: "extraction",
      title: "OCR Extraction",
      description: "Splitting document and extracting text",
      status: progress > 20 ? (progress >= 60 ? "completed" : "in-progress") : "pending",
    },
    {
      id: "analysis",
      title: "AI Analysis",
      description: "Identifying clauses, risks, and obligations",
      status: progress >= 60 ? (progress === 100 ? "completed" : "in-progress") : "pending",
    },
  ]

  useEffect(() => {
    if (!id) return

    const pollStatus = async () => {
      try {
        const res = await fetch(`${BASE_URL}/contracts/${id}/status`)
        if (!res.ok) throw new Error("Failed to fetch status")
        const data = await res.json()
        
        setStatus(data.status)
        setProgress(data.progress)

        if (data.status === "completed") {
          // Keep it for a second so user sees 100%
          setTimeout(() => router.push(`/contracts/${id}`), 1500)
        }
      } catch (err) {
        console.error("Polling error:", err)
        setError("Connection lost. Retrying...")
      }
    }

    const interval = setInterval(pollStatus, 3000)
    pollStatus() // Initial check

    return () => clearInterval(interval)
  }, [id, router])

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Processing Contract</h1>
        <p className="text-muted-foreground">Analyzing your document with AI</p>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
              <FileText className="size-8 text-primary" />
            </div>
            <CardTitle className="truncate">{id}</CardTitle>
            <CardDescription>Pipeline ID: {id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              {error && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="size-3" /> {error}
                </p>
              )}
            </div>

            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step.id} className="relative">
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "absolute left-4 top-8 h-full w-0.5 -translate-x-1/2",
                      step.status === "completed" ? "bg-success" : "bg-muted-foreground/20"
                    )} />
                  )}
                  <div className="relative flex items-start gap-4 pb-8">
                    <div className={cn(
                      "flex size-8 items-center justify-center rounded-full",
                      step.status === "completed" && "bg-success text-success-foreground",
                      step.status === "in-progress" && "bg-primary text-primary-foreground",
                      step.status === "pending" && "border-2 border-muted-foreground/30",
                    )}>
                      {step.status === "completed" && <Check className="size-4" />}
                      {step.status === "in-progress" && <Loader2 className="size-4 animate-spin" />}
                      {step.status === "pending" && <Circle className="size-3 text-muted-foreground/30" />}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className={cn("font-medium", step.status === "pending" && "text-muted-foreground")}>
                        {step.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => router.push("/contracts")}>Cancel Analysis</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
