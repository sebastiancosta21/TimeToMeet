import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import MeetingDetail from "@/components/meeting-detail"

interface MeetingPageProps {
  params: {
    id: string
  }
}

export default async function MeetingPage({ params }: MeetingPageProps) {
  const supabase = createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch meeting data
  const { data: meeting, error } = await supabase.from("meetings").select("*").eq("id", params.id).single()

  if (error || !meeting) {
    notFound()
  }

  // Check if user has access to this meeting
  const { data: participant } = await supabase
    .from("meeting_participants")
    .select("*")
    .eq("meeting_id", params.id)
    .eq("user_id", user.id)
    .single()

  const isCreator = meeting.created_by === user.id
  const hasAccess = isCreator || participant

  if (!hasAccess) {
    redirect("/")
  }

  return <MeetingDetail meeting={meeting} user={user} isCreator={isCreator} />
}
