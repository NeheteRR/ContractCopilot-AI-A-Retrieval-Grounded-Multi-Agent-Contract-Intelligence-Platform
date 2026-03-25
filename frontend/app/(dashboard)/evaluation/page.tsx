"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { TrendingUp, TrendingDown, Target, Crosshair, Brain, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

import { BASE_URL } from "@/lib/api-config"

export default function EvaluationPage() {
  const [data, setData] = useState<{
    trendData: any[]
    metrics: any[]
    recentEvaluations: any[]
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE_URL}/evaluations`)
      .then((res) => res.json())
      .then((fetchedData) => {
        setData(fetchedData)
        setLoading(false)
      })
      .catch((err) => {
        console.error("Failed to fetch evaluations:", err)
        setLoading(false)
      })
  }, [])

  if (loading || !data) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const { trendData, metrics, recentEvaluations } = data

  const getIcon = (name: string) => {
    if (name === "Faithfulness") return Target
    if (name === "Relevance") return Crosshair
    return Brain
  }

  const getColors = (name: string) => {
    if (name === "Faithfulness") return { color: "text-success", bgColor: "bg-success/10" }
    if (name === "Relevance") return { color: "text-primary", bgColor: "bg-primary/10" }
    return { color: "text-warning", bgColor: "bg-warning/10" }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Evaluation</h1>
        <p className="text-muted-foreground">
          Monitor and assess the quality of AI-powered contract analysis
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => {
          const Icon = getIcon(metric.name)
          const colors = getColors(metric.name)
          return (
            <Card key={metric.name}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`flex size-8 items-center justify-center rounded-lg ${colors.bgColor}`}>
                        <Icon className={`size-4 ${colors.color}`} />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">
                        {metric.name}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{metric.value}%</span>
                      <span
                        className={`flex items-center text-sm font-medium ${
                          metric.isPositive ? "text-success" : "text-destructive"
                        }`}
                      >
                        {metric.isPositive ? (
                          <TrendingUp className="mr-1 size-4" />
                        ) : (
                          <TrendingDown className="mr-1 size-4" />
                        )}
                        {metric.change}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Target: {metric.target}%</span>
                        <span className={metric.value >= metric.target ? "text-success" : "text-warning"}>
                          {metric.value >= metric.target ? "Met" : "Below"}
                        </span>
                      </div>
                      <Progress
                        value={(metric.value / 100) * 100}
                        className="h-1.5"
                      />
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Performance Trend</CardTitle>
          <CardDescription>
            Evaluation metrics over time across all processed contracts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.26 0 0)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }}
                  axisLine={{ stroke: "oklch(0.26 0 0)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[80, 100]}
                  tick={{ fill: "oklch(0.65 0 0)", fontSize: 12 }}
                  axisLine={{ stroke: "oklch(0.26 0 0)" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>
                      {value}
                    </span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="faithfulness"
                  name="Faithfulness"
                  stroke="oklch(0.6 0.2 145)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.6 0.2 145)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="relevance"
                  name="Relevance"
                  stroke="oklch(0.65 0.15 250)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.65 0.15 250)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="recall"
                  name="Recall"
                  stroke="oklch(0.75 0.18 80)"
                  strokeWidth={2}
                  dot={{ fill: "oklch(0.75 0.18 80)", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Evaluations</CardTitle>
          <CardDescription>
            Individual contract analysis evaluation results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentEvaluations.length > 0 ? (
              recentEvaluations.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <h4 className="font-medium">{evaluation.contract}</h4>
                      <p className="text-sm text-muted-foreground">
                        {evaluation.id} | {evaluation.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm font-medium">{evaluation.faithfulness}%</p>
                      <p className="text-xs text-muted-foreground">Faithfulness</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{evaluation.relevance}%</p>
                      <p className="text-xs text-muted-foreground">Relevance</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{evaluation.recall}%</p>
                      <p className="text-xs text-muted-foreground">Recall</p>
                    </div>
                    <Badge
                      className={
                        evaluation.status === "passed"
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }
                    >
                      {evaluation.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No evaluations processed yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
