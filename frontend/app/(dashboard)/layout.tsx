import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TopNavbar } from "@/components/top-navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNavbar />
        <main className="relative flex-1 overflow-auto">
          {/* Subtle gradient mesh background */}
          <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-chart-2/[0.02]" />
          <div className="relative">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
