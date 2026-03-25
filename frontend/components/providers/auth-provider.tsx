"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { BASE_URL } from "@/lib/api-config"

type UserProfile = {
  id: number
  name: string
  email: string
  role: string
}

type AuthContextType = {
  user: UserProfile | null
  token: string | null
  login: (token: string, userData: UserProfile) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check local storage for token on mount
    const storedToken = localStorage.getItem("access_token")
    if (storedToken) {
      setToken(storedToken)
      // Fetch user profile to verify token
      fetch(`${BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      })
        .then(res => {
          if (res.ok) return res.json()
          throw new Error("Invalid token")
        })
        .then(data => {
          setUser(data)
          setIsLoading(false)
        })
        .catch(() => {
          // Token is invalid
          localStorage.removeItem("access_token")
          setToken(null)
          setUser(null)
          setIsLoading(false)
        })
    } else {
      setIsLoading(false)
    }
  }, [])

  // Route protection
  useEffect(() => {
    if (!isLoading) {
      if (!user && !pathname.startsWith("/login")) {
        router.push("/login")
      } else if (user && pathname.startsWith("/login")) {
        router.push("/")
      }
    }
  }, [user, isLoading, pathname, router])

  const login = (newToken: string, userData: UserProfile) => {
    localStorage.setItem("access_token", newToken)
    setToken(newToken)
    setUser(userData)
    router.push("/")
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    setToken(null)
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
