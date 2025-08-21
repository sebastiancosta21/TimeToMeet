import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Dashboard from "@/components/dashboard"

export const dynamic = "force-dynamic"

export default async function Home() {
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Connect Supabase to get started</h1>
          <p className="text-muted-foreground">Please configure your Supabase integration to use MeetingHub.</p>
        </div>
      </div>
    )
  }

  let supabase
  try {
    supabase = await createClient()
  } catch (error) {
    console.error("[v0] Error creating Supabase client:", error)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">Configuration Error</h1>
          <p className="text-muted-foreground">
            There was an issue with the Supabase configuration. Please check your environment variables.
          </p>
        </div>
      </div>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login (this should not be caught by try-catch)
  if (!user) {
    redirect("/auth/login")
  }

  // Create or update user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  if (!profile) {
    await supabase.from("profiles").insert({
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name || "",
    })
  }

  return <Dashboard user={user} />
}
