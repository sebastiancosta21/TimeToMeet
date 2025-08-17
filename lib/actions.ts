"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { render } from "@react-email/render"
import { Resend } from "resend"
import MeetingInvitation from "@/emails/meeting-invitation"
import MeetingSummary from "@/emails/meeting-summary"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

if (!resend) {
  console.log("[v0] Email service not configured - RESEND_API_KEY missing")
} else {
  console.log("[v0] Email service configured successfully")
}

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  try {
    const { error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    return { success: "Check your email to confirm your account." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  await supabase.auth.signOut()
  redirect("/auth/login")
}

export async function createMeeting(formData: FormData) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const title = formData.get("title")?.toString()
  const description = formData.get("description")?.toString()
  const scheduled_date = formData.get("scheduled_date")?.toString()
  const scheduled_time = formData.get("scheduled_time")?.toString()
  const duration_minutes = Number.parseInt(formData.get("duration_minutes")?.toString() || "60")
  const location = formData.get("location")?.toString()

  if (!title || !scheduled_date || !scheduled_time) {
    return { error: "Title, date, and time are required" }
  }

  try {
    const { data: meeting, error } = await supabase
      .from("meetings")
      .insert({
        title,
        description,
        scheduled_date: `${scheduled_date}T${scheduled_time}:00`,
        scheduled_time,
        duration_minutes,
        location,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    return { success: true, meeting }
  } catch (error) {
    console.error("Create meeting error:", error)
    return { error: "Failed to create meeting" }
  }
}

export async function inviteParticipant(meetingId: string, email: string) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    const { data: profile } = await supabase.from("profiles").select("id, full_name").eq("email", email).single()

    const { error: participantError } = await supabase.from("meeting_participants").insert({
      meeting_id: meetingId,
      user_id: profile?.id,
      email,
      role: "participant",
    })

    if (participantError) {
      return { error: participantError.message }
    }

    if (resend) {
      const { data: meeting } = await supabase
        .from("meetings")
        .select("title, scheduled_date, scheduled_time, location")
        .eq("id", meetingId)
        .single()

      const { data: inviter } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()

      if (meeting) {
        const emailHtml = render(
          MeetingInvitation({
            meetingTitle: meeting.title,
            meetingDate: new Date(meeting.scheduled_date).toLocaleDateString(),
            meetingTime: meeting.scheduled_time,
            location: meeting.location,
            inviterName: inviter?.full_name || "Someone",
            meetingId,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          }),
        )

        try {
          console.log("[v0] Attempting to send invitation email to:", email)
          await resend.emails.send({
            from: "meetings@yourdomain.com",
            to: [email],
            subject: `Meeting Invitation: ${meeting.title}`,
            html: emailHtml,
          })
          console.log("[v0] Invitation email sent successfully to:", email)
        } catch (emailError) {
          console.error("[v0] Failed to send invitation email:", emailError)
          // Continue without failing the invitation
        }
      }
    } else {
      console.log("[v0] Email service not configured - invitation email not sent to:", email)
    }

    return { success: true }
  } catch (error) {
    console.error("Invite participant error:", error)
    return { error: "Failed to invite participant" }
  }
}

export async function endMeeting(meetingId: string) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    const { data: meeting, error: fetchError } = await supabase
      .from("meetings")
      .select("is_recurring, status")
      .eq("id", meetingId)
      .single()

    if (fetchError) {
      console.error(
        "[v0] Database error - missing columns? Run scripts/04-add-meeting-status.sql and scripts/05-add-recurring-meetings.sql",
      )
      return { error: "Database schema needs to be updated. Please run the required SQL scripts." }
    }

    if (!meeting) {
      return { error: "Meeting not found" }
    }

    const updateData = meeting.is_recurring
      ? { status: "scheduled" } // Reset recurring meetings to scheduled
      : { status: "ended", ended_at: new Date().toISOString() } // End non-recurring meetings

    const { error: updateError } = await supabase
      .from("meetings")
      .update(updateData)
      .eq("id", meetingId)
      .eq("created_by", user.id)

    if (updateError) {
      return { error: updateError.message }
    }

    if (resend) {
      const { data: meetingData } = await supabase
        .from("meetings")
        .select("title, scheduled_date")
        .eq("id", meetingId)
        .single()

      const { data: participants } = await supabase
        .from("meeting_participants")
        .select("email")
        .eq("meeting_id", meetingId)

      const { data: discussionItems } = await supabase
        .from("discussion_items")
        .select("title, description")
        .eq("meeting_id", meetingId)
        .eq("status", "done")

      const { data: todos } = await supabase
        .from("todos")
        .select("title, assigned_email, due_date")
        .eq("meeting_id", meetingId)

      if (meetingData && participants) {
        const emailHtml = render(
          MeetingSummary({
            meetingTitle: meetingData.title,
            meetingDate: new Date(meetingData.scheduled_date).toLocaleDateString(),
            discussionItems: discussionItems || [],
            todos: todos || [],
          }),
        )

        const participantEmails = participants.map((p) => p.email).filter(Boolean)

        if (participantEmails.length > 0) {
          try {
            console.log("[v0] Attempting to send summary email to:", participantEmails)
            await resend.emails.send({
              from: "meetings@yourdomain.com",
              to: participantEmails,
              subject: `Meeting Summary: ${meetingData.title}`,
              html: emailHtml,
            })
            console.log("[v0] Summary email sent successfully")
          } catch (emailError) {
            console.error("[v0] Failed to send summary email:", emailError)
            // Continue without failing the meeting end
          }
        }
      }
    } else {
      console.log("[v0] Email service not configured - summary email not sent")
    }

    return { success: true, isRecurring: meeting.is_recurring }
  } catch (error) {
    console.error("End meeting error:", error)
    return { error: "Failed to end meeting" }
  }
}
