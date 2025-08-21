"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { sendMeetingSummary as sendMeetingSummaryEmail } from "@/lib/email"

export async function signIn(prevState: any, formData: FormData) {
  console.log("[v0] SignIn function called")

  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    console.log("[v0] Email:", email)

    if (!email || !password) {
      console.log("[v0] Missing email or password")
      return { error: "Email and password are required" }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.log("[v0] SignIn error:", error.message)
      return { error: error.message }
    }

    console.log("[v0] SignIn successful")
    revalidatePath("/", "layout")

    return { success: true }
  } catch (error) {
    console.log("[v0] SignIn error:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function signUp(prevState: any, formData: FormData) {
  console.log("[v0] SignUp function called")

  try {
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    console.log("[v0] Email:", email)

    if (!email || !password) {
      console.log("[v0] Missing email or password")
      return { error: "Email and password are required" }
    }

    const supabase = await createClient()

    const getRedirectUrl = () => {
      // For development, use the dev environment variable
      if (process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL) {
        return process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL
      }

      // For production, construct the URL properly
      if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}/auth/callback`
      }

      // Fallback to localhost for local development
      return "http://localhost:3000/auth/callback"
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectUrl(),
      },
    })

    if (error) {
      console.log("[v0] SignUp error:", error.message)
      return { error: error.message }
    }

    console.log("[v0] SignUp successful")
    revalidatePath("/", "layout")
    redirect("/auth/login?message=Check your email to continue sign in process")
  } catch (error) {
    console.log("[v0] SignUp error:", error)
    return { error: "An unexpected error occurred" }
  }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/auth/login")
}

export async function createMeeting(formData: FormData) {
  const supabase = await createClient()

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const scheduledDate = formData.get("scheduledDate") as string
  const scheduledTime = formData.get("scheduledTime") as string
  const duration = formData.get("duration") as string
  const location = formData.get("location") as string
  const isRecurring = formData.get("isRecurring") === "true"
  const frequency = formData.get("frequency") as string

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      title,
      description,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      duration: Number.parseInt(duration),
      location,
      created_by: user.id,
      is_recurring: isRecurring,
      frequency: isRecurring ? frequency : null,
      status: "scheduled",
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/")
  return { success: true, meeting: data }
}

export async function addParticipant(meetingId: string, email: string) {
  console.log("[v0] addParticipant called with:", { meetingId, email })

  const supabase = await createClient()

  console.log("[v0] Getting user authentication...")
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  console.log("[v0] Auth result:", { user: user?.id, authError })

  if (!user) {
    console.log("[v0] User not authenticated")
    return { error: "Not authenticated" }
  }

  console.log("[v0] User authenticated:", user.id)

  // Verify the user is the creator of the meeting
  console.log("[v0] Checking meeting ownership...")
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select("created_by, title")
    .eq("id", meetingId)
    .single()

  console.log("[v0] Meeting query result:", { meeting, meetingError })

  if (meetingError || !meeting) {
    console.log("[v0] Meeting not found or error:", meetingError)
    return { error: "Meeting not found" }
  }

  console.log("[v0] Meeting creator:", meeting.created_by, "Current user:", user.id)

  if (meeting.created_by !== user.id) {
    console.log("[v0] User is not the meeting creator")
    return { error: "Only meeting creators can add participants" }
  }

  console.log("[v0] User is meeting creator, proceeding with participant insertion...")

  // Check if participant already exists
  const { data: existingParticipant } = await supabase
    .from("meeting_participants")
    .select("id")
    .eq("meeting_id", meetingId)
    .eq("email", email)
    .single()

  if (existingParticipant) {
    console.log("[v0] Participant already exists")
    return { error: "Participant already invited" }
  }

  console.log("[v0] Inserting new participant...")
  const { data, error } = await supabase
    .from("meeting_participants")
    .insert({
      meeting_id: meetingId,
      email: email,
      status: "pending",
    })
    .select()
    .single()

  console.log("[v0] Insert result:", { data, error })

  if (error) {
    console.log("[v0] Insert error details:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    return { error: error.message }
  }

  console.log("[v0] Participant added successfully:", data)
  revalidatePath(`/meetings/${meetingId}`)
  return { success: true, participant: data }
}

export async function submitMeetingSummary(meetingId: string) {
  const supabase = await createClient()

  try {
    const { data: meeting } = await supabase.from("meetings").select("*").eq("id", meetingId).single()

    if (!meeting) {
      return { error: "Meeting not found" }
    }

    // Fetch participants for email recipients
    const { data: participants } = await supabase
      .from("meeting_participants")
      .select("email")
      .eq("meeting_id", meetingId)

    // Fetch discussion items for email content
    const { data: discussionItems } = await supabase
      .from("discussion_items")
      .select("title, description")
      .eq("meeting_id", meetingId)
      .eq("status", "pending")

    // Fetch todos for email content
    const { data: todos } = await supabase
      .from("todos")
      .select("title, assigned_to_email, due_date")
      .eq("meeting_id", meetingId)

    if (participants && participants.length > 0) {
      const participantEmails = participants.map((p) => p.email)

      console.log("[v0] Sending meeting summary email to:", participantEmails)

      const emailResult = await sendMeetingSummaryEmail({
        to: participantEmails,
        meetingTitle: meeting.title,
        meetingDate: new Date(meeting.scheduled_date).toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        discussionItems: discussionItems || [],
        todos: todos || [],
      })

      if (!emailResult.success) {
        console.log("[v0] Email sending failed:", emailResult.error)
        return { error: "Failed to send email summary: " + emailResult.error }
      }

      console.log("[v0] Email summary sent successfully")
    } else {
      console.log("[v0] No participants found, skipping email")
    }

    // For one-time meetings, close the meeting
    if (!meeting.is_recurring) {
      await supabase.from("meetings").update({ status: "closed" }).eq("id", meetingId)
    }

    console.log("[v0] Meeting summary submitted successfully")
    revalidatePath(`/meetings/${meetingId}`)
    return { success: true }
  } catch (error) {
    console.log("[v0] Submit summary error:", error)
    return { error: "Failed to submit meeting summary" }
  }
}

export async function closeMeeting(meetingId: string) {
  const supabase = await createClient()

  const { error } = await supabase.from("meetings").update({ status: "closed" }).eq("id", meetingId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/")
  return { success: true }
}

// Export aliases for compatibility
export const sendMeetingSummary = submitMeetingSummary
export const inviteParticipant = addParticipant
