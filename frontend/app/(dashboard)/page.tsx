"use client"

import { useState, useEffect } from "react"
import { FileText, ClipboardList, AlertTriangle, CalendarClock, ArrowRight, Sparkles, Loader2 } from "lucide-react"
import Link from "next/link"
import { KpiCard } from "@/components/kpi-card"
import { RiskDistributionChart } from "@/components/risk-distribution-chart"
import { UpcomingDeadlines } from "@/components/upcoming-deadlines"
import { RecentContractsTable } from "@/components/recent-contracts-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BASE_URL } from "@/lib/api-config"

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE_URL}/stats`)
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch stats:", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-secondary/30 p-6 lg:p-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                <Sparkles className="mr-1 size-3" />
                AI-Powered
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Contract Intelligence</h1>
            <p className="max-w-xl text-muted-foreground">
              AI-powered analysis of your contract portfolio. Get real-time insights on risks, obligations, and upcoming deadlines.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="gap-2">
              <Link href="/contracts">View All Contracts<ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild className="gap-2 shadow-lg shadow-primary/25">
              <Link href="/contracts/upload"><Sparkles className="size-4" />Analyze Contract</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Contracts" value={stats?.totalContracts || 0} icon={FileText} />
        <KpiCard title="Active Obligations" value={stats?.activeObligations || 0} icon={ClipboardList} variant="default" />
        <KpiCard title="High Risks" value={stats?.highRisks || 0} icon={AlertTriangle} variant="destructive" />
        <KpiCard title="Upcoming Deadlines" value={stats?.upcomingDeadlines || 0} icon={CalendarClock} variant="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RiskDistributionChart data={stats?.riskDistribution} />
        <UpcomingDeadlines />
      </div>

      <RecentContractsTable />
    </div>
  )
}
