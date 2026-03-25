"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Upload, FileText, X, CalendarIcon, ArrowLeft, Sparkles, FileUp, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { BASE_URL } from "@/lib/api-config"

const features = [
  "AI-powered clause extraction",
  "Risk identification & scoring",
  "Obligation timeline generation",
  "Key terms summarization",
]

export default function UploadContractPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [contractName, setContractName] = useState("")
  const [referenceDate, setReferenceDate] = useState<Date>()
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile)
      if (!contractName) {
        setContractName(droppedFile.name.replace(".pdf", ""))
      }
    }
  }, [contractName])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile?.type === "application/pdf") {
      setFile(selectedFile)
      if (!contractName) {
        setContractName(selectedFile.name.replace(".pdf", ""))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !contractName) return

    try {
      const formData = new FormData()
      formData.append("file", file)
      
      const response = await fetch(`${BASE_URL}/analyze`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error("Upload failed")
      
      const data = await response.json()
      // Use the actual contract_id from backend if provided, else filename stem
      const contractId = data.contract_id || contractName.replace(".pdf", "")
      router.push(`/contracts/processing?id=${encodeURIComponent(contractId)}&name=${encodeURIComponent(contractName)}`)
    } catch (err) {
      console.error("Upload error:", err)
      alert("Failed to upload contract. Please make sure the backend is running on port 8001.")
    }
  }

  const removeFile = () => {
    setFile(null)
  }

  return (
    <div className="flex flex-col gap-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/contracts">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Upload Contract</h1>
          <p className="text-sm text-muted-foreground">
            Upload a PDF contract for AI-powered analysis
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Upload Form */}
        <div className="lg:col-span-3">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                  <FileUp className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">Upload Document</CardTitle>
                  <CardDescription className="text-xs">
                    Drag and drop or click to upload your contract PDF
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div
                  className={cn(
                    "group relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300",
                    isDragging
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-secondary/50",
                    file && "border-success bg-success/5"
                  )}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {file ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-success/10 text-success">
                        <FileText className="size-7" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB - Ready to analyze
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile()
                        }}
                        className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="size-3.5" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
                        <Upload className="size-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Click or drag and drop to upload</p>
                        <p className="text-xs text-muted-foreground">
                          PDF files up to 50MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <FieldGroup>
                  <Field>
                    <FieldLabel>Contract Name</FieldLabel>
                    <Input
                      placeholder="Enter contract name"
                      value={contractName}
                      onChange={(e) => setContractName(e.target.value)}
                      className="h-11"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Reference Date (Optional)</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-11 w-full justify-start text-left font-normal",
                            !referenceDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {referenceDate ? format(referenceDate, "PPP") : "Select reference date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={referenceDate}
                          onSelect={setReferenceDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>
                </FieldGroup>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!file || !contractName}
                    className="flex-1 gap-2 shadow-lg shadow-primary/25 sm:flex-none"
                  >
                    <Sparkles className="size-4" />
                    Start Analysis
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <CardTitle className="text-base font-semibold">AI Analysis Features</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Our AI will automatically extract and analyze
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="flex size-6 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="size-3.5 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Processing Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average time</span>
                  <Badge variant="secondary">~2 minutes</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Max file size</span>
                  <Badge variant="secondary">50 MB</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Supported format</span>
                  <Badge variant="outline">PDF</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
