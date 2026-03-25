"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Search, Filter, Eye, ArrowUpDown, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BASE_URL } from "@/lib/api-config"

export default function ObligationsPage() {
  const [allObligations, setAllObligations] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [searchQuery, setSearchQuery] = useState("")
  const [contractFilter, setContractFilter] = useState("all")
  const [riskFilter, setRiskFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"deadline" | "risk">("deadline")

  useEffect(() => {
    Promise.all([
      fetch(`${BASE_URL}/obligations`).then(res => res.json()),
      fetch(`${BASE_URL}/contracts`).then(res => res.json())
    ]).then(([obligationsData, contractsData]) => {
      setAllObligations(obligationsData || [])
      setContracts([{ id: "all", name: "All Contracts" }, ...contractsData])
      setLoading(false)
    }).catch(err => {
      console.error("Failed to fetch obligations:", err)
      setLoading(false)
    })
  }, [])

  const filteredObligations = allObligations
    .filter((obligation) => {
      const matchesSearch =
        obligation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obligation.contract.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesContract =
        contractFilter === "all" || obligation.contractId === contractFilter
      const matchesRisk =
        riskFilter === "all" || obligation.riskLevel === riskFilter
      return matchesSearch && matchesContract && matchesRisk
    })
    .sort((a, b) => {
      if (sortBy === "deadline") {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      }
      const riskOrder = { high: 0, medium: 1, low: 2 }
      return (
        (riskOrder[a.riskLevel as keyof typeof riskOrder] || 3) -
        (riskOrder[b.riskLevel as keyof typeof riskOrder] || 3)
      )
    })

  const getRiskBadge = (level: string) => {
    const variants = {
      high: "bg-destructive/10 text-destructive",
      medium: "bg-warning/10 text-warning",
      low: "bg-success/10 text-success",
    }
    return variants[level as keyof typeof variants] || variants.low
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-secondary text-secondary-foreground",
      completed: "bg-success/10 text-success",
      overdue: "bg-destructive/10 text-destructive",
    }
    return variants[status as keyof typeof variants] || variants.pending
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Obligations</h1>
        <p className="text-muted-foreground">
          Track and manage contract obligations and deadlines
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{allObligations.length}</div>
            <p className="text-sm text-muted-foreground">Total Obligations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {allObligations.filter((o) => o.riskLevel === "high").length}
            </div>
            <p className="text-sm text-muted-foreground">High Risk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-warning">
              {allObligations.filter((o) => o.status === "overdue").length}
            </div>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">
              {allObligations.filter((o) => o.status === "completed").length}
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle className="text-base font-semibold">
              All Obligations ({filteredObligations.length})
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search obligations..."
                  className="h-9 w-full pl-9 sm:w-48"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={contractFilter} onValueChange={setContractFilter}>
                <SelectTrigger className="h-9 w-full sm:w-48">
                  <Filter className="mr-2 size-4" />
                  <SelectValue placeholder="Contract" />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="h-9 w-full sm:w-32">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() =>
                  setSortBy(sortBy === "deadline" ? "risk" : "deadline")
                }
              >
                <ArrowUpDown className="mr-2 size-4" />
                Sort by {sortBy === "deadline" ? "Risk" : "Deadline"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obligation</TableHead>
                <TableHead>Contract</TableHead>
                <TableHead>Clause Reference</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredObligations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No obligations found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredObligations.map((obligation) => (
                  <TableRow key={obligation.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{obligation.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {obligation.id}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/contracts/${obligation.contractId}`}
                        className="text-sm hover:underline"
                      >
                        {obligation.contract}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {obligation.clauseRef}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {obligation.deadline}
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskBadge(obligation.riskLevel)}>
                        {obligation.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadge(obligation.status)}>
                        {obligation.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="size-8" asChild>
                        <Link href={`/contracts/${obligation.contractId}`}>
                          <Eye className="size-4" />
                          <span className="sr-only">View</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
