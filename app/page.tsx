import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Dashboard from "@/components/dashboard"

export default async function Home() {
  // If Supabase is not configured, show setup message directly
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

  // Get the user from the server
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If no user, redirect to login
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
