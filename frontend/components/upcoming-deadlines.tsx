"use client"

import { useState, useEffect } from "react"
import { CalendarClock, ArrowUpRight, Loader2 } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BASE_URL } from "@/lib/api-config"

const priorityStyles = {
  high: "border-l-destructive bg-destructive/5",
  medium: "border-l-warning bg-warning/5",
  low: "border-l-primary bg-secondary/50",
}

export function UpcomingDeadlines() {
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE_URL}/deadlines`)
      .then(res => res.json())
      .then(data => {
        setDeadlines(data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch deadlines:", err)
        setLoading(false)
      })
  }, [])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Upcoming Deadlines</CardTitle>
          <CardDescription className="text-xs">
            Important dates requiring your attention
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-xs text-muted-foreground">
          <Link href="/timeline">
            View all
            <ArrowUpRight className="size-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : deadlines.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-center">
            <CalendarClock className="mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">No upcoming deadlines</p>
          </div>
        ) : (
          <div className="space-y-3">
            {deadlines.map((item) => (
              <Link
                key={item.id}
                href={`/contracts/${item.id.split('-')[0].replace('_analysis', '')}`} 
                className={cn(
                  "group flex items-center justify-between rounded-lg border-l-2 p-3 transition-all hover:translate-x-0.5",
                  priorityStyles[item.priority as keyof typeof priorityStyles] || priorityStyles.medium
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-background shadow-sm">
                    <CalendarClock className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="max-w-[180px] truncate text-sm font-medium transition-colors group-hover:text-primary">
                      {item.contract}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.deadline}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={item.daysLeft <= 7 ? "destructive" : "secondary"}
                    className="text-[10px] font-medium"
                  >
                    {item.daysLeft}d
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {item.type}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
