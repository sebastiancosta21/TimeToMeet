import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Login route handler called")

    const requestUrl = new URL(request.url)
    const formData = await request.formData()
    const email = String(formData.get("email"))
    const password = String(formData.get("password"))

    console.log("[v0] Email:", email)

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.log("[v0] Login error:", error.message)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(error.message)}`)
    }

    console.log("[v0] Login successful, redirecting to dashboard")
    return NextResponse.redirect(`${requestUrl.origin}/`)
  } catch (error) {
    console.log("[v0] Login route handler error:", error)
    const requestUrl = new URL(request.url)
    return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=Authentication failed`)
  }
}
