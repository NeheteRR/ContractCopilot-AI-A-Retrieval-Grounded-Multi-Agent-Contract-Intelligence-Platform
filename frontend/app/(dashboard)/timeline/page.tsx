"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CalendarDays, List, ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"



const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function TimelinePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/timeline")
      .then(res => res.json())
      .then(data => {
        setEvents(data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch timeline:", err)
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

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return events.filter((event) => event.date === dateStr)
  }

  const getRiskBadge = (level: string) => {
    const variants = {
      high: "bg-destructive/10 text-destructive",
      medium: "bg-warning/10 text-warning",
      low: "bg-success/10 text-success",
    }
    return variants[level as keyof typeof variants] || variants.low
  }

  const getTypeBadge = (type: string) => {
    const variants = {
      deadline: "bg-destructive/10 text-destructive",
      renewal: "bg-primary/10 text-primary",
      payment: "bg-warning/10 text-warning",
      review: "bg-secondary text-secondary-foreground",
    }
    return variants[type as keyof typeof variants] || variants.review
  }

  const filteredEvents = events.filter((event) => {
    const eventDate = new Date(event.date)
    return eventDate.getMonth() === month && eventDate.getFullYear() === year
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timeline</h1>
          <p className="text-muted-foreground">
            Track upcoming deadlines and contract milestones
          </p>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "list")}>
          <TabsList>
            <TabsTrigger value="calendar">
              <CalendarDays className="mr-2 size-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="mr-2 size-4" />
              List
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {months[month]} {year}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => navigateMonth("prev")}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigateMonth("next")}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {view === "calendar" ? (
            <div className="grid grid-cols-7 gap-1">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}
              {Array.from({ length: firstDayOfMonth }).map((_, index) => (
                <div key={`empty-${index}`} className="min-h-[100px] p-2" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const dayEvents = getEventsForDay(day)
                
                const today = new Date()
                const isToday = 
                  day === today.getDate() && 
                  month === today.getMonth() && 
                  year === today.getFullYear()

                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-[100px] rounded-md border border-border p-2 transition-colors hover:bg-secondary/50",
                      isToday && "border-primary bg-primary/5 shadow-[inset_0_0_0_1px_rgba(var(--primary),0.2)]"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-1 text-sm font-medium",
                        isToday && "text-primary"
                      )}
                    >
                      {day}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event) => (
                        <div
                          key={event.id}
                          className={cn(
                            "truncate rounded px-1 py-0.5 text-xs",
                            getRiskBadge(event.riskLevel)
                          )}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event) => {
                  const eventDate = new Date(event.date)
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center rounded-lg bg-secondary p-2 text-center">
                          <span className="text-xs text-muted-foreground">
                            {months[eventDate.getMonth()].slice(0, 3)}
                          </span>
                          <span className="text-lg font-bold">
                            {eventDate.getDate()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium">{event.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {event.contract}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getTypeBadge(event.type)}>
                          {event.type}
                        </Badge>
                        <Badge className={getRiskBadge(event.riskLevel)}>
                          {event.riskLevel}
                        </Badge>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/contracts/${event.contractId}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No events this month
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
