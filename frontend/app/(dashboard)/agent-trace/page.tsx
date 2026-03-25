"use client"

import { useState, useEffect } from "react"
import { Check, ArrowRight, ChevronDown, ChevronUp, FileText, Sparkles, AlertTriangle, Shield, Clock, Loader2, Brain, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

interface PipelineStep {
  id: string | number
  name: string
  status: "success" | "validated" | "pending" | "failed"
  duration: string
  input: string
  output: string
  details?: string[]
}

export default function AgentTracePage() {
  const [contracts, setContracts] = useState<{ id: string; name: string }[]>([])
  const [selectedContract, setSelectedContract] = useState<string>("")
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSteps, setExpandedSteps] = useState<(string | number)[]>([])

  useEffect(() => {
    // Fetch contracts for the dropdown
    fetch(`${BASE_URL}/contracts`)
      .then((res) => res.json())
      .then((data) => {
        setContracts(data)
        if (data.length > 0) {
          setSelectedContract(data[0].id)
        } else {
          setLoading(false)
        }
      })
      .catch((err) => console.error("Error fetching contracts:", err))
  }, [])

  useEffect(() => {
    if (!selectedContract) return
    setLoading(true)
    fetch(`${BASE_URL}/contracts/${encodeURIComponent(selectedContract)}/trace`)
      .then((res) => res.json())
      .then((data) => {
        setSteps(data)
        if (data.length > 0) {
          setExpandedSteps([data[0].id])
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error("Error fetching trace:", err)
        setLoading(false)
      })
  }, [selectedContract])

  const toggleStep = (stepId: string | number) => {
    setExpandedSteps((prev) =>
      prev.includes(stepId)
        ? prev.filter((id) => id !== stepId)
        : [...prev, stepId]
    )
  }

  const getStepIcon = (name: string) => {
    if (name.includes("Ingestion")) return FileText
    if (name.includes("Vector")) return Sparkles
    if (name.includes("AI Extraction")) return Brain
    if (name.includes("Persistence")) return Shield
    if (name.includes("Evaluation")) return Target
    return FileText
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-success/10 text-success">
            <Check className="mr-1 size-3" />
            Success
          </Badge>
        )
      case "validated":
        return (
          <Badge className="bg-primary/10 text-primary">
            <Shield className="mr-1 size-3" />
            Validated
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-destructive/10 text-destructive">
            <AlertTriangle className="mr-1 size-3" />
            Failed
          </Badge>
        )
      default:
        return (
          <Badge className="bg-secondary text-secondary-foreground">
            <Clock className="mr-1 size-3" />
            Pending
          </Badge>
        )
    }
  }

  if (loading && contracts.length > 0) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agent Trace</h1>
          <p className="text-muted-foreground">
            Visualize the AI pipeline processing steps
          </p>
        </div>
        <Select value={selectedContract} onValueChange={setSelectedContract}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Select contract" />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((contract) => (
              <SelectItem key={contract.id} value={contract.id}>
                {contract.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedContract ? (
          <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg">
              <FileText className="size-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">No contracts found. Upload a contract to see the processing trace.</p>
          </div>
      ) : (
      <>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pipeline Flow</CardTitle>
            <CardDescription>
              Step-by-step analysis process for contract intelligence extraction
            </CardDescription>
          </CardHeader>
          <CardHeader>
          <div className="flex items-center justify-between gap-4 overflow-x-auto pb-4">
              {steps.map((step, index) => {
                const Icon = getStepIcon(step.name)
                return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex size-12 items-center justify-center rounded-full",
                        step.status === "success" && "bg-success/10",
                        step.status === "validated" && "bg-primary/10",
                        step.status === "failed" && "bg-destructive/10"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-6",
                          step.status === "success" && "text-success",
                          step.status === "validated" && "text-primary",
                          step.status === "failed" && "text-destructive"
                        )}
                      />
                    </div>
                    <span className="mt-2 text-xs font-medium text-center whitespace-nowrap">
                      {step.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {step.duration}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="mx-2 size-5 shrink-0 text-muted-foreground" />
                  )}
                </div>
              )})}
              {steps.length === 0 && <p className="text-sm text-muted-foreground">No trace data recorded yet.</p>}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Live Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Steps</span>
              <span className="font-medium">{steps.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={steps.every(s => s.status === 'success') ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}>
                   {steps.length > 0 ? (steps.every(s => s.status === 'success') ? 'Operational' : 'Processing') : 'Idle'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Step Details</CardTitle>
          <CardDescription>
            Expand each step to see input, output, and processing details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="rounded-lg border border-border overflow-hidden"
              >
                <button
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-secondary/50 transition-colors"
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{step.name}</span>
                        {getStatusBadge(step.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Duration: {step.duration}
                      </p>
                    </div>
                  </div>
                  {expandedSteps.includes(step.id) ? (
                    <ChevronUp className="size-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-5 text-muted-foreground" />
                  )}
                </button>
                {expandedSteps.includes(step.id) && (
                  <div className="border-t border-border bg-secondary/20 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="mb-2 text-sm font-medium">Input</h4>
                        <div className="rounded-md bg-card p-3 text-sm">
                          {step.input}
                        </div>
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-medium">Output</h4>
                        <div className="rounded-md bg-card p-3 text-sm">
                          {step.output}
                        </div>
                      </div>
                    </div>
                    {step.details && step.details.length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-2 text-sm font-medium">Processing Details</h4>
                        <ScrollArea className="h-24">
                          <ul className="space-y-1">
                            {step.details.map((detail: string, idx: number) => (
                              <li
                                key={idx}
                                className="flex items-center gap-2 text-sm text-muted-foreground"
                              >
                                <Check className="size-3 text-success" />
                                {detail}
                              </li>
                            ))}
                          </ul>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  )
}
