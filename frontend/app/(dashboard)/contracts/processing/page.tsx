"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Circle, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

import { useSearchParams } from "next/navigation"
import { BASE_URL } from "@/lib/api-config"

type StepStatus = "completed" | "in-progress" | "pending"

interface ProcessingStep {
  id: string
  title: string
  description: string
  status: StepStatus
}

const initialSteps: ProcessingStep[] = [
  {
    id: "upload",
    title: "Upload",
    description: "Document received and validated",
    status: "completed",
  },
  {
    id: "processing",
    title: "AI Analysis",
    description: "Extracting clauses, obligations, and risks",
    status: "in-progress",
  },
  {
    id: "evaluation",
    title: "Ragas Evaluation",
    description: "Measuring extraction accuracy and quality",
    status: "pending",
  },
]

export default function ProcessingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const contractId = searchParams.get("id") || "CON-001"
  const contractName = searchParams.get("name") || "Contract"
  
  const [steps, setSteps] = useState<ProcessingStep[]>(initialSteps)
  const [progress, setProgress] = useState(20)

  useEffect(() => {
    if (!contractId) return

    const pollStatus = async () => {
      try {
        const res = await fetch(`${BASE_URL}/contracts/${encodeURIComponent(contractId)}/status`)
        if (res.ok) {
          const data = await res.json()
          
          if (data.status === "completed") {
            setSteps([
              { id: "upload", title: "Upload", description: "Completed", status: "completed" },
              { id: "processing", title: "AI Analysis", description: "Completed", status: "completed" },
              { id: "evaluation", title: "Ragas Evaluation", description: "Completed", status: "completed" },
            ])
            setProgress(100)
            return true // Stop polling
          } else if (data.status === "processing") {
            setSteps([
              { id: "upload", title: "Upload", description: "Completed", status: "completed" },
              { id: "processing", title: "AI Analysis", description: "In Progress", status: "in-progress" },
              { id: "evaluation", title: "Ragas Evaluation", description: "Pending", status: "pending" },
            ])
            setProgress(60)
          }
        }
      } catch (err) {
        console.error("Polling error:", err)
      }
      return false
    }

    const interval = setInterval(async () => {
      const isDone = await pollStatus()
      if (isDone) clearInterval(interval)
    }, 3000)

    pollStatus() // Initial check

    return () => clearInterval(interval)
  }, [contractId])

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return (
          <div className="flex size-8 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-4" />
          </div>
        )
      case "in-progress":
        return (
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )
      case "pending":
        return (
          <div className="flex size-8 items-center justify-center rounded-full border-2 border-muted-foreground/30">
            <Circle className="size-3 text-muted-foreground/30" />
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Processing Contract</h1>
        <p className="text-muted-foreground">
          Analyzing your document with AI
        </p>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
              <FileText className="size-8 text-primary" />
            </div>
            <CardTitle>{contractName}</CardTitle>
            <CardDescription>{contractId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step.id} className="relative">
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "absolute left-4 top-8 h-full w-0.5 -translate-x-1/2",
                        step.status === "completed"
                          ? "bg-success"
                          : "bg-muted-foreground/20"
                      )}
                    />
                  )}
                  <div className="relative flex items-start gap-4 pb-8">
                    {getStatusIcon(step.status)}
                    <div className="flex-1 pt-1">
                      <p
                        className={cn(
                          "font-medium",
                          step.status === "pending" && "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                    {step.status === "in-progress" && (
                      <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        In Progress
                      </span>
                    )}
                    {step.status === "completed" && (
                      <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                        Complete
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => router.push("/contracts")}>
                Cancel
              </Button>
              <Button 
                disabled={progress < 100}
                onClick={() => router.push(`/contracts/${encodeURIComponent(contractId)}`)}
              >
                {progress < 100 ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "View Results"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
