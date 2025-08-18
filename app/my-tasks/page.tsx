import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import MyTasksView from "@/components/my-tasks-view"

export default async function MyTasksPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <MyTasksView user={user} />
}
