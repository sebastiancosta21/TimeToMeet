"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Calendar } from "lucide-react"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get("code")
        const error = searchParams.get("error")
        const type = searchParams.get("type")

        if (error) {
          console.error("Auth callback error:", error)
          router.push(`/auth/login?error=${error}`)
          return
        }

        if (code) {
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error("Code exchange error:", exchangeError)
            router.push("/auth/login?error=code_exchange_failed")
            return
          }

          // Check if this is a password recovery flow
          if (type === "recovery" || searchParams.get("next") === "/auth/reset-password") {
            router.push("/auth/reset-password")
            return
          }

          // Regular email confirmation - redirect to dashboard
          if (data.session) {
            router.push("/")
            return
          }
        }

        // Fallback: check for existing session
        const { data, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error("Session check error:", sessionError)
          router.push("/auth/login?error=session_error")
          return
        }

        if (data.session) {
          router.push("/")
        } else {
          router.push("/auth/login")
        }
      } catch (error) {
        console.error("Unexpected error during auth callback:", error)
        router.push("/auth/login?error=unexpected_error")
      }
    }

    handleAuthCallback()
  }, [router, supabase.auth, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center mb-4">
          <Calendar className="h-8 w-8 text-primary mr-2" />
          <span className="text-2xl font-bold font-work-sans text-foreground">MeetingHub</span>
        </div>
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  )
}
