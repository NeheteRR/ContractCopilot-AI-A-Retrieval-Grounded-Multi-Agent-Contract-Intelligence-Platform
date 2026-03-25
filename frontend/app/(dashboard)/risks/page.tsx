"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts"
import { AlertTriangle, ArrowRight, Shield, ShieldAlert, ShieldCheck, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BASE_URL } from "@/lib/api-config"

export default function RisksPage() {
  const [risks, setRisks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE_URL}/risks`)
      .then(res => res.json())
      .then(data => {
        setRisks(data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch risks:", err)
        setLoading(false)
      })
  }, [])

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "high":
        return <ShieldAlert className="size-5 text-destructive" />
      case "medium":
        return <Shield className="size-5 text-warning" />
      default:
        return <ShieldCheck className="size-5 text-success" />
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const highRisks = risks.filter(r => r.severity === "high")
  const mediumRisks = risks.filter(r => r.severity === "medium")
  const lowRisks = risks.filter(r => r.severity === "low")

  const riskDistribution = [
    { name: "High", value: highRisks.length, color: "oklch(0.55 0.22 25)" },
    { name: "Medium", value: mediumRisks.length, color: "oklch(0.75 0.18 80)" },
    { name: "Low", value: lowRisks.length, color: "oklch(0.6 0.2 145)" },
  ]

  const categories = risks.reduce((acc: any, risk: any) => {
    acc[risk.category] = (acc[risk.category] || 0) + 1
    return acc
  }, {})

  const riskByCategory = Object.keys(categories).map(cat => ({
    category: cat,
    count: categories[cat]
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk Dashboard</h1>
        <p className="text-muted-foreground">
          Analyze and manage contract risks across your portfolio
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-destructive/10">
              <ShieldAlert className="size-6 text-destructive" />
            </div>
            <div>
              <div className="text-2xl font-bold">{highRisks.length}</div>
              <p className="text-sm text-muted-foreground">High Risk Items</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-warning/10">
              <Shield className="size-6 text-warning" />
            </div>
            <div>
              <div className="text-2xl font-bold">{mediumRisks.length}</div>
              <p className="text-sm text-muted-foreground">Medium Risk Items</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-success/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-12 items-center justify-center rounded-lg bg-success/10">
              <ShieldCheck className="size-6 text-success" />
            </div>
            <div>
              <div className="text-2xl font-bold">{lowRisks.length}</div>
              <p className="text-sm text-muted-foreground">Low Risk Items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Risk Distribution</CardTitle>
            <CardDescription>Overview of risk levels across all contracts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6">
              {riskDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name} ({item.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Risk by Category</CardTitle>
            <CardDescription>Number of risks identified per category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskByCategory} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={100}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Bar
                    dataKey="count"
                    fill="oklch(0.65 0.25 260)"
                    radius={[0, 4, 4, 0]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                    cursor={{ fill: "transparent" }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />
                High Risk Obligations
              </CardTitle>
              <CardDescription>Requires immediate attention</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {highRisks.map((risk) => (
              <div
                key={risk.id}
                className="rounded-lg border border-destructive/20 bg-destructive/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {getRiskIcon("high")}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{risk.title}</h4>
                        <Badge variant="destructive" className="bg-destructive/20">
                          Impact: {risk.impactScore}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {risk.contract}
                      </p>
                      <p className="text-sm">{risk.description}</p>
                      <div className="mt-2 rounded-md bg-card p-2">
                        <p className="text-xs">
                          <span className="font-medium text-success">Recommendation: </span>
                          {risk.recommendation || "Needs review."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/contracts/${risk.contractId}`}>
                      View
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {highRisks.length === 0 && (
              <p className="text-sm text-muted-foreground">No high risks detected.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="size-4 text-warning" />
                Medium Risk Obligations
              </CardTitle>
              <CardDescription>Should be reviewed and addressed</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mediumRisks.map((risk) => (
              <div
                key={risk.id}
                className="rounded-lg border border-warning/20 bg-warning/5 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {getRiskIcon("medium")}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{risk.title}</h4>
                        <Badge className="bg-warning/20 text-warning">
                          Impact: {risk.impactScore}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {risk.contract}
                      </p>
                      <p className="text-sm">{risk.description}</p>
                      <div className="mt-2 rounded-md bg-card p-2">
                        <p className="text-xs">
                          <span className="font-medium text-success">Recommendation: </span>
                          {risk.recommendation || "Needs review."}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/contracts/${risk.contractId}`}>
                      View
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {mediumRisks.length === 0 && (
              <p className="text-sm text-muted-foreground">No medium risks detected.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
