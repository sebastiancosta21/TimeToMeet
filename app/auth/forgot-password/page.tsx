"use client"

import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Calendar, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string

    try {
      const getRedirectUrl = () => {
        console.log("[v0] Environment variables check:")
        console.log("[v0] NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL:", process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL)
        console.log("[v0] typeof window:", typeof window)

        // For development with explicit dev URL
        if (process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL) {
          console.log("[v0] Using dev redirect URL:", process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL)
          return process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
        }

        // For client-side production detection
        if (typeof window !== "undefined") {
          const origin = window.location.origin
          const hostname = window.location.hostname
          const protocol = window.location.protocol
          const port = window.location.port

          console.log("[v0] Window location details:")
          console.log("[v0] - hostname:", hostname)
          console.log("[v0] - protocol:", protocol)
          console.log("[v0] - port:", port)
          console.log("[v0] - origin:", origin)

          const redirectUrl = `${origin}/auth/reset-password`
          console.log("[v0] Constructed redirect URL:", redirectUrl)
          return redirectUrl
        }

        // Final fallback
        const fallbackUrl = "http://localhost:3000/auth/reset-password"
        console.log("[v0] Using fallback URL:", fallbackUrl)
        return fallbackUrl
      }

      const redirectUrl = getRedirectUrl()
      console.log("[v0] ===== FINAL REDIRECT URL BEING SENT TO SUPABASE =====")
      console.log("[v0] Redirect URL:", redirectUrl)
      console.log("[v0] Email:", email)
      console.log("[v0] ================================================")

      const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      console.log("[v0] Supabase resetPasswordForEmail response:")
      console.log("[v0] - data:", data)
      console.log("[v0] - error:", resetError)

      if (resetError) {
        console.log("[v0] Reset password error:", resetError.message)
        setError(resetError.message)
      } else {
        console.log("[v0] Reset password email sent successfully")
        setSuccess(true)
      }
    } catch (err) {
      console.log("[v0] Unexpected error in forgot password:", err)
      setError("An unexpected error occurred")
    } finally {
      setIsPending(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-primary mr-2" />
              <span className="text-2xl font-bold font-work-sans text-foreground">MeetingHub</span>
            </div>
            <CardTitle className="text-2xl font-work-sans">Check your email</CardTitle>
            <CardDescription>
              We've sent a password reset link to your email address. Click the link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-primary mr-2" />
            <span className="text-2xl font-bold font-work-sans text-foreground">MeetingHub</span>
          </div>
          <CardTitle className="text-2xl font-work-sans">Reset your password</CardTitle>
          <CardDescription>Enter your email address and we'll send you a link to reset your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
                className="bg-input border-border"
              />
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending reset link...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>

            <div className="text-center text-sm">
              <Link
                href="/auth/login"
                className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
