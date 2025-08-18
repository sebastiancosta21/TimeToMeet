"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { Resend } from "resend"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

if (!resend) {
  console.log("[v0] Email service not configured - RESEND_API_KEY missing")
} else {
  console.log("[v0] Email service configured successfully")
}

function createInvitationEmailHtml({
  meetingTitle,
  meetingDate,
  meetingTime,
  location,
  inviterName,
  meetingId,
  siteUrl,
}: {
  meetingTitle: string
  meetingDate: string
  meetingTime: string
  location?: string
  inviterName: string
  meetingId: string
  siteUrl: string
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Meeting Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Meeting Invitation</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hi there! ${inviterName} has invited you to a meeting.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <h2 style="margin: 0 0 15px 0; color: #2563eb;">${meetingTitle}</h2>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${meetingDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${meetingTime}</p>
            ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ""}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${siteUrl}/meetings/${meetingId}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Meeting Details
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            This invitation was sent by ${inviterName}. If you have any questions, please contact them directly.
          </p>
        </div>
      </body>
    </html>
  `
}

function createSummaryEmailHtml({
  meetingTitle,
  meetingDate,
  discussionItems,
  todos,
}: {
  meetingTitle: string
  meetingDate: string
  discussionItems: Array<{ title: string; description?: string }>
  todos: Array<{ title: string; assigned_email?: string; due_date?: string }>
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Meeting Summary</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #500000; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Meeting Summary</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #500000;">
            <h2 style="margin: 0 0 10px 0; color: #500000;">${meetingTitle}</h2>
            <p style="margin: 0; color: #666;">Meeting Date: ${meetingDate}</p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #500000;">Discussion Items Completed</h3>
            ${
              discussionItems.length > 0
                ? discussionItems
                    .map(
                      (item) => `
                <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong>${item.title}</strong>
                  ${item.description ? `<p style="margin: 5px 0 0 0; color: #666;">${item.description}</p>` : ""}
                </div>
              `,
                    )
                    .join("")
                : '<p style="color: #666; font-style: italic;">No discussion items were completed.</p>'
            }
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #500000;">Action Items</h3>
            ${
              todos.length > 0
                ? todos
                    .map(
                      (todo) => `
                <div style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <strong>${todo.title}</strong>
                  ${todo.assigned_email ? `<p style="margin: 5px 0 0 0; color: #666;">Assigned to: ${todo.assigned_email}</p>` : ""}
                  ${todo.due_date ? `<p style="margin: 5px 0 0 0; color: #666;">Due: ${new Date(todo.due_date).toLocaleDateString()}</p>` : ""}
                </div>
              `,
                    )
                    .join("")
                : '<p style="color: #666; font-style: italic;">No action items were created.</p>'
            }
          </div>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px; text-align: center;">
            Thank you for attending the meeting!
          </p>
        </div>
      </body>
    </html>
  `
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
    const { data: user, error } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true, user }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "Failed to sign up" }
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
    console.log("[v0] Starting participant invitation for:", email, "to meeting:", meetingId)

    const { data: profile } = await supabase.from("profiles").select("id, full_name").eq("email", email).single()

    const { error: participantError } = await supabase.from("meeting_participants").insert({
      meeting_id: meetingId,
      user_id: profile?.id,
      email,
      role: "participant",
    })

    if (participantError) {
      console.error("[v0] Failed to add participant to database:", participantError)
      return { error: participantError.message }
    }

    console.log("[v0] Participant added to database successfully")

    if (resend) {
      console.log("[v0] Resend service available, fetching meeting data...")

      const { data: meeting } = await supabase
        .from("meetings")
        .select("title, scheduled_date, scheduled_time, location")
        .eq("id", meetingId)
        .single()

      const { data: inviter } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()

      console.log("[v0] Meeting data:", meeting)
      console.log("[v0] Inviter data:", inviter)

      if (meeting) {
        console.log("[v0] Generating invitation email HTML...")

        const emailHtml = createInvitationEmailHtml({
          meetingTitle: meeting.title,
          meetingDate: new Date(meeting.scheduled_date).toLocaleDateString(),
          meetingTime: meeting.scheduled_time,
          location: meeting.location,
          inviterName: inviter?.full_name || "Someone",
          meetingId,
          siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        })

        console.log("[v0] Email HTML generated, length:", emailHtml.length)

        try {
          console.log("[v0] Attempting to send invitation email to:", email)
          const result = await resend.emails.send({
            from: "noreply@timetomeet.tech",
            to: [email],
            subject: `Meeting Invitation: ${meeting.title}`,
            html: emailHtml,
          })
          console.log("[v0] Invitation email sent successfully to:", email, "Result:", result)
        } catch (emailError) {
          console.error("[v0] Failed to send invitation email:", emailError)
          // Continue without failing the invitation
        }
      } else {
        console.error("[v0] No meeting data found for ID:", meetingId)
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

      console.log("[v0] Meeting data:", meetingData)
      console.log("[v0] Participants:", participants)
      console.log("[v0] Discussion items:", discussionItems)
      console.log("[v0] Todos:", todos)

      if (meetingData && participants) {
        console.log("[v0] Generating summary email HTML...")

        const emailHtml = createSummaryEmailHtml({
          meetingTitle: meetingData.title,
          meetingDate: new Date(meetingData.scheduled_date).toLocaleDateString(),
          discussionItems: discussionItems || [],
          todos: todos || [],
        })

        console.log("[v0] Summary email HTML generated, length:", emailHtml.length)

        const participantEmails = participants.map((p) => p.email).filter(Boolean)

        console.log("[v0] Participant emails to send to:", participantEmails)

        if (participantEmails.length > 0) {
          try {
            console.log("[v0] Attempting to send summary email to:", participantEmails)
            const result = await resend.emails.send({
              from: "noreply@timetomeet.tech",
              to: participantEmails,
              subject: `Meeting Summary: ${meetingData.title}`,
              html: emailHtml,
            })
            console.log("[v0] Summary email sent successfully, Result:", result)
          } catch (emailError) {
            console.error("[v0] Failed to send summary email:", emailError)
            // Continue without failing the meeting end
          }
        } else {
          console.log("[v0] No participant emails found to send summary to")
        }
      } else {
        console.error("[v0] Missing meeting data or participants")
      }
    } else {
      console.log("[v0] Email service not configured - summary email not sent")
      return { error: "Email service not configured" }
    }

    return { success: true, isRecurring: meeting.is_recurring }
  } catch (error) {
    console.error("End meeting error:", error)
    return { error: "Failed to end meeting" }
  }
}

export async function sendMeetingSummary(meetingId: string) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    console.log("[v0] Starting meeting summary send for meeting:", meetingId)

    if (resend) {
      console.log("[v0] Resend service available, fetching meeting data...")

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

      console.log("[v0] Meeting data:", meetingData)
      console.log("[v0] Participants:", participants)
      console.log("[v0] Discussion items:", discussionItems)
      console.log("[v0] Todos:", todos)

      if (meetingData && participants) {
        console.log("[v0] Generating summary email HTML...")

        const emailHtml = createSummaryEmailHtml({
          meetingTitle: meetingData.title,
          meetingDate: new Date(meetingData.scheduled_date).toLocaleDateString(),
          discussionItems: discussionItems || [],
          todos: todos || [],
        })

        console.log("[v0] Summary email HTML generated, length:", emailHtml.length)

        const participantEmails = participants.map((p) => p.email).filter(Boolean)

        console.log("[v0] Participant emails to send to:", participantEmails)

        if (participantEmails.length > 0) {
          try {
            console.log("[v0] Attempting to send summary email to:", participantEmails)
            const result = await resend.emails.send({
              from: "noreply@timetomeet.tech",
              to: participantEmails,
              subject: `Meeting Summary: ${meetingData.title}`,
              html: emailHtml,
            })
            console.log("[v0] Summary email sent successfully, Result:", result)
          } catch (emailError) {
            console.error("[v0] Failed to send summary email:", emailError)
            return { error: "Failed to send summary email" }
          }
        } else {
          console.log("[v0] No participant emails found to send summary to")
        }
      } else {
        console.error("[v0] Missing meeting data or participants")
      }
    } else {
      console.log("[v0] Email service not configured - summary email not sent")
      return { error: "Email service not configured" }
    }

    return { success: true }
  } catch (error) {
    console.error("Send summary error:", error)
    return { error: "Failed to send meeting summary" }
  }
}

export async function closeMeeting(meetingId: string) {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    const { error: updateError } = await supabase
      .from("meetings")
      .update({ status: "closed" })
      .eq("id", meetingId)
      .eq("created_by", user.id)

    if (updateError) {
      return { error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Close meeting error:", error)
    return { error: "Failed to close meeting" }
  }
}
