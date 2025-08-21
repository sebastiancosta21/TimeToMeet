import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import GlobalTodoDashboard from "@/components/global-todo-dashboard"

export const dynamic = "force-dynamic"

export default async function TodosPage() {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    return <GlobalTodoDashboard user={user} />
  } catch (error) {
    console.error("Error in TodosPage:", error)
    redirect("/auth/login")
  }
}
