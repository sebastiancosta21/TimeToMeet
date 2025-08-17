import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import GlobalTodoDashboard from "@/components/global-todo-dashboard"

export default async function TodosPage() {
  const supabase = createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <GlobalTodoDashboard user={user} />
}
