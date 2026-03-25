"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Eye, MoreHorizontal, FileText, ArrowUpRight, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { BASE_URL } from "@/lib/api-config"

export function RecentContractsTable() {
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${BASE_URL}/contracts`)
      .then(res => res.json())
      .then(data => {
        // Sort by date (desc) and take top 5
        const sorted = data.sort((a: any, b: any) => 
          new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
        ).slice(0, 5)
        setContracts(sorted)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch recent contracts:", err)
        setLoading(false)
      })
  }, [])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Recent Contracts</CardTitle>
          <CardDescription className="text-xs">
            Latest contracts uploaded and analyzed by AI
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild className="gap-1 text-xs">
          <Link href="/contracts">View all<ArrowUpRight className="size-3" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6">Contract</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risks</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No contracts found.
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id} className="group">
                    <TableCell className="pl-6">
                      <Link href={`/contracts/${contract.id}`} className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-secondary transition-colors group-hover:bg-primary/10">
                          <FileText className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                        </div>
                        <div>
                          <p className="font-medium transition-colors group-hover:text-primary">{contract.name}</p>
                          <p className="text-xs text-muted-foreground">{contract.id} - {contract.uploadDate}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] font-normal">{contract.type}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {contract.status === "Completed" ? (
                          <>
                            <CheckCircle2 className="size-3.5 text-success" />
                            <span className="text-xs font-medium text-success">{contract.status}</span>
                          </>
                        ) : (
                          <>
                            <Loader2 className="size-3.5 animate-spin text-warning" />
                            <span className="text-xs font-medium text-warning">{contract.status}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {contract.risks > 0 ? (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="size-3.5 text-warning" />
                          <span className="text-xs font-medium text-warning">{contract.risks}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/contracts/${contract.id}`}><Eye className="mr-2 size-4" />View Details</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
