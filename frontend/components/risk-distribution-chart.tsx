"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
        <p className="text-sm font-medium">{payload[0].name}</p>
        <p className="text-xs text-muted-foreground">{payload[0].value} contracts</p>
      </div>
    )
  }
  return null
}

export function RiskDistributionChart({ data }: { data?: any[] }) {
  const chartData = data || [
    { name: "High Risk", value: 0, color: "oklch(0.6 0.2 25)" },
    { name: "Medium Risk", value: 0, color: "oklch(0.8 0.15 85)" },
    { name: "Low Risk", value: 0, color: "oklch(0.72 0.15 180)" },
  ]

  const total = chartData.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Risk Distribution</CardTitle>
        <CardDescription className="text-xs">
          Breakdown of contract risk levels across your portfolio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="relative h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{total}</span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</span>
            </div>
          </div>
          
          <div className="flex flex-1 flex-col gap-4">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
