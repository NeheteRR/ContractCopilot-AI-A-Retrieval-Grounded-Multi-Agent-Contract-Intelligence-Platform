import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  variant?: "default" | "success" | "warning" | "destructive"
}

const variantStyles = {
  default: {
    icon: "bg-primary/10 text-primary",
    glow: "group-hover:shadow-primary/10",
    border: "group-hover:border-primary/20",
  },
  success: {
    icon: "bg-success/10 text-success",
    glow: "group-hover:shadow-success/10",
    border: "group-hover:border-success/20",
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    glow: "group-hover:shadow-warning/10",
    border: "group-hover:border-warning/20",
  },
  destructive: {
    icon: "bg-destructive/10 text-destructive",
    glow: "group-hover:shadow-destructive/10",
    border: "group-hover:border-destructive/20",
  },
}

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = "default",
}: KpiCardProps) {
  const styles = variantStyles[variant]

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-0.5",
      styles.glow,
      styles.border
    )}>
      {/* Subtle gradient overlay */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-secondary/30" />
      
      <CardContent className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold tracking-tight">{value}</p>
              {trend && (
                <div
                  className={cn(
                    "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    trend.isPositive 
                      ? "bg-success/10 text-success" 
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
              styles.icon
            )}
          >
            <Icon className="size-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
