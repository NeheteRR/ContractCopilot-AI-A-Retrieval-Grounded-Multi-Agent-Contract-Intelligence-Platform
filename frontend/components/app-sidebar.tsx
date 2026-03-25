"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  AlertTriangle,
  Calendar,
  GitBranch,
  BarChart3,
  Sparkles,
  Search,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { BASE_URL } from "@/lib/api-config"

const aiNavigation = [
  {
    title: "Evaluation",
    url: "/evaluation",
    icon: BarChart3,
  },
  {
    title: "Agent Trace",
    url: "/agent-trace",
    icon: GitBranch,
  },
]

import { useState, useEffect } from "react"

export function AppSidebar() {
  const pathname = usePathname()
  const [stats, setStats] = useState({ contracts: 0, risks: 0, obligations: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${BASE_URL}/dashboard/stats`)
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error("Failed to fetch sidebar stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    // Optional: set up interval to refresh stats
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const mainNavigation = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Contracts",
      url: "/contracts",
      icon: FileText,
      badge: loading ? null : stats.contracts.toString(),
    },
    {
      title: "Smart Search",
      url: "/search",
      icon: Search,
    },
  ]

  const analysisNavigation = [
    {
      title: "Obligations",
      url: "/obligations",
      icon: ClipboardList,
      badge: loading ? null : stats.obligations.toString(),
    },
    {
      title: "Risks",
      url: "/risks",
      icon: AlertTriangle,
      badge: loading ? null : stats.risks.toString(),
      badgeVariant: "destructive" as const,
    },
    {
      title: "Timeline",
      url: "/timeline",
      icon: Calendar,
    },
  ]

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25">
            <Sparkles className="size-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">ContractCopilot</span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-primary">AI Intelligence</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      (item.url !== "/" && pathname.startsWith(item.url))
                    }
                    tooltip={item.title}
                    className="group/menu-item"
                  >
                    <Link href={item.url} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <item.icon className="size-4 text-muted-foreground group-data-[active=true]/menu-item:text-primary" />
                        <span>{item.title}</span>
                      </span>
                      {item.badge && (
                        <Badge variant="secondary" className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-medium">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Analysis
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analysisNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      (item.url !== "/" && pathname.startsWith(item.url))
                    }
                    tooltip={item.title}
                    className="group/menu-item"
                  >
                    <Link href={item.url} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <item.icon className="size-4 text-muted-foreground group-data-[active=true]/menu-item:text-primary" />
                        <span>{item.title}</span>
                      </span>
                      {item.badge && (
                        <Badge 
                          variant={item.badgeVariant || "secondary"} 
                          className="ml-auto h-5 min-w-5 px-1.5 text-[10px] font-medium"
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            AI Pipeline
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiNavigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.url ||
                      (item.url !== "/" && pathname.startsWith(item.url))
                    }
                    tooltip={item.title}
                    className="group/menu-item"
                  >
                    <Link href={item.url}>
                      <item.icon className="size-4 text-muted-foreground group-data-[active=true]/menu-item:text-primary" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary/10 to-transparent p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-1">
          <div className="flex size-6 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="size-3 text-primary" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-[10px] font-medium text-primary">Enterprise Plan</span>
            <span className="text-[9px] text-muted-foreground">Unlimited contracts</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
