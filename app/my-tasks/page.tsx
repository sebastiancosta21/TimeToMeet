import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import MyTasksView from "@/components/my-tasks-view"

export const dynamic = "force-dynamic"

export default async function MyTasksPage() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect("/auth/login")
    }

    return <MyTasksView user={user} />
  } catch (error) {
    console.error("Error in MyTasksPage:", error)
    redirect("/auth/login")
  }
}
