"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

// Create Supabase server client
function createClient() {
  const cookieStore = cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}

// Authentication functions
export async function signIn(prevState: any, formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return {
      error: error.message,
    }
  }

  return { success: true }
}

export async function signUp(prevState: any, formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }

  const { error } = await supabase.auth.signUp({
    ...data,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}`,
    },
  })

  if (error) {
    return {
      error: error.message,
    }
  }

  return { success: true, message: "Check your email to confirm your account" }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}

export async function closeMeeting(meetingId: string) {
  console.log("[v0] Closing meeting:", meetingId)

  try {
    const supabase = createClient()

    const { error } = await supabase.from("meetings").update({ status: "closed" }).eq("id", meetingId)

    if (error) {
      console.error("[v0] Error closing meeting:", error)
      return { success: false, error: "Failed to close meeting" }
    }

    console.log("[v0] Meeting closed successfully")
    return { success: true }
  } catch (error) {
    console.error("[v0] Close meeting error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Simple HTML email templates
function createInvitationEmailHtml(meetingTitle: string, meetingDate: string, inviterName: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Invitation</title>
      </head>
      <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Meeting Invitation</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 18px; margin-bottom: 20px;">You've been invited to join a meeting!</p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #500000;">
            <h2 style="color: #500000; margin: 0 0 10px 0; font-size: 20px;">${meetingTitle}</h2>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Date:</strong> ${meetingDate}</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Invited by:</strong> ${inviterName || "Meeting Organizer"}</p>
          </div>
          
          <p style="margin: 20px 0;">Please create an account or log in to view meeting details, participate in discussions, and manage tasks.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://your-app.vercel.app"}" 
               style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">
              View Meeting Details
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #9ca3af; text-align: center; margin: 0;">
            This invitation was sent from TimeToMeet. If you didn't expect this invitation, you can safely ignore this email.
          </p>
        </div>
      </body>
    </html>
  `
}

function createSummaryEmailHtml(meetingTitle: string, meetingDate: string, discussionItems: any[], todos: any[]) {
  const discussionItemsHtml =
    discussionItems.length > 0
      ? discussionItems
          .map(
            (item) => `
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 3px solid #500000;">
          <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 16px;">${item.title}</h4>
          ${item.description ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">${item.description}</p>` : ""}
        </div>
      `,
          )
          .join("")
      : '<p style="color: #9ca3af; font-style: italic;">No discussion items were completed in this meeting.</p>'

  const todosHtml =
    todos.length > 0
      ? todos
          .map(
            (todo) => `
        <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 3px solid #2563eb;">
          <h4 style="margin: 0 0 8px 0; color: #374151; font-size: 16px;">${todo.title}</h4>
          ${todo.assigned_email ? `<p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Assigned to:</strong> ${todo.assigned_email}</p>` : ""}
          ${todo.due_date ? `<p style="margin: 0; color: #6b7280; font-size: 14px;"><strong>Due:</strong> ${new Date(todo.due_date).toLocaleDateString()}</p>` : ""}
        </div>
      `,
          )
          .join("")
      : '<p style="color: #9ca3af; font-style: italic;">No action items were created in this meeting.</p>'

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Summary</title>
      </head>
      <body style="font-family: 'Inter', Arial, sans-serif; line-height: 1.6; color: #374151; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #500000 0%, #7c2d12 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Meeting Summary</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #500000;">
            <h2 style="color: #500000; margin: 0 0 10px 0; font-size: 20px;">${meetingTitle}</h2>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Date:</strong> ${meetingDate}</p>
          </div>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #500000; padding-bottom: 8px;">📋 Discussion Items Covered</h3>
            ${discussionItemsHtml}
          </div>
          
          <div style="margin: 30px 0;">
            <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">✅ Action Items</h3>
            ${todosHtml}
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 14px; color: #9ca3af; text-align: center; margin: 0;">
            This summary was generated from TimeToMeet. Keep track of your action items and follow up on discussion points.
          </p>
        </div>
      </body>
    </html>
  `
}

export async function sendMeetingSummary(meetingId: string) {
  console.log("[v0] Starting meeting summary send for meeting:", meetingId)

  try {
    const supabase = createClient()

    // Check if Resend is available
    if (!process.env.RESEND_API_KEY) {
      console.log("[v0] Resend API key not configured, skipping email send")
      return { success: false, error: "Email service not configured" }
    }

    console.log("[v0] Resend service available, fetching meeting data...")

    // Get meeting data
    const { data: meetingData, error: meetingError } = await supabase
      .from("meetings")
      .select("title, scheduled_date, is_recurring")
      .eq("id", meetingId)
      .single()

    if (meetingError || !meetingData) {
      console.error("[v0] Error fetching meeting data:", meetingError)
      return { success: false, error: "Failed to fetch meeting data" }
    }

    console.log("[v0] Meeting data:", meetingData)

    // Get participants
    const { data: participants, error: participantsError } = await supabase
      .from("meeting_participants")
      .select("email")
      .eq("meeting_id", meetingId)

    if (participantsError) {
      console.error("[v0] Error fetching participants:", participantsError)
      return { success: false, error: "Failed to fetch participants" }
    }

    console.log("[v0] Participants:", participants)

    // Get discussion items (completed ones)
    const { data: discussionItems, error: discussionError } = await supabase
      .from("discussion_items")
      .select("title, description")
      .eq("meeting_id", meetingId)
      .eq("status", "done")

    if (discussionError) {
      console.error("[v0] Error fetching discussion items:", discussionError)
    }

    console.log("[v0] Discussion items:", discussionItems)

    // Get todos
    const { data: todos, error: todosError } = await supabase
      .from("todos")
      .select("title, assigned_email, due_date")
      .eq("meeting_id", meetingId)

    if (todosError) {
      console.error("[v0] Error fetching todos:", todosError)
    }

    console.log("[v0] Todos:", todos)

    // Generate email HTML
    console.log("[v0] Generating summary email HTML...")
    const emailHtml = createSummaryEmailHtml(
      meetingData.title,
      new Date(meetingData.scheduled_date).toLocaleDateString(),
      discussionItems || [],
      todos || [],
    )

    console.log("[v0] Summary email HTML generated, length:", emailHtml.length)

    // Get participant emails
    const participantEmails = participants?.map((p) => p.email).filter(Boolean) || []
    console.log("[v0] Participant emails to send to:", participantEmails)

    if (participantEmails.length === 0) {
      console.log("[v0] No participants to send summary to")
      return { success: false, error: "No participants found" }
    }

    // Send email using Resend
    console.log("[v0] Attempting to send summary email to:", participantEmails)

    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const emailResult = await resend.emails.send({
      from: "noreply@timetomeet.tech",
      to: participantEmails,
      subject: `Meeting Summary: ${meetingData.title}`,
      html: emailHtml,
    })

    console.log("[v0] Summary email sent successfully, Result:", emailResult)

    // Handle meeting closure based on type
    if (!meetingData.is_recurring) {
      // Close one-time meetings
      console.log("[v0] Closing one-time meeting...")
      const { error: updateError } = await supabase.from("meetings").update({ status: "closed" }).eq("id", meetingId)

      if (updateError) {
        console.error("[v0] Error closing meeting:", updateError)
      } else {
        console.log("[v0] One-time meeting closed successfully")
      }
    } else {
      console.log("[v0] Recurring meeting remains open")
    }

    return { success: true, data: emailResult }
  } catch (error) {
    console.error("[v0] Send summary error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function inviteParticipant(meetingId: string, email: string) {
  console.log("[v0] Starting participant invitation for:", email, "to meeting:", meetingId)

  try {
    const supabase = createClient()

    // Add participant to database
    const { error: participantError } = await supabase.from("meeting_participants").insert({
      meeting_id: meetingId,
      email: email,
      status: "pending",
      role: "participant",
    })

    if (participantError) {
      console.error("[v0] Error adding participant:", participantError)
      return { success: false, error: "Failed to add participant" }
    }

    console.log("[v0] Participant added to database successfully")

    // Send invitation email if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.log("[v0] Resend API key not configured, skipping invitation email")
      return { success: true, message: "Participant added (email service not configured)" }
    }

    console.log("[v0] Resend service available, fetching meeting data...")

    // Get meeting data for email
    const { data: meetingData, error: meetingError } = await supabase
      .from("meetings")
      .select("title, scheduled_date, scheduled_time, location")
      .eq("id", meetingId)
      .single()

    if (meetingError || !meetingData) {
      console.error("[v0] Error fetching meeting data:", meetingError)
      return { success: true, message: "Participant added but failed to send invitation email" }
    }

    console.log("[v0] Meeting data:", meetingData)

    // Get inviter data
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: inviterData } = await supabase.from("profiles").select("full_name").eq("id", user?.id).single()

    console.log("[v0] Inviter data:", inviterData)

    // Generate invitation email HTML
    console.log("[v0] Generating invitation email HTML...")
    const emailHtml = createInvitationEmailHtml(
      meetingData.title,
      new Date(meetingData.scheduled_date).toLocaleDateString(),
      inviterData?.full_name || "",
    )

    console.log("[v0] Email HTML generated, length:", emailHtml.length)

    // Send invitation email
    console.log("[v0] Attempting to send invitation email to:", email)

    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const emailResult = await resend.emails.send({
      from: "noreply@timetomeet.tech",
      to: [email],
      subject: `Meeting Invitation: ${meetingData.title}`,
      html: emailHtml,
    })

    console.log("[v0] Invitation email sent successfully to:", email, "Result:", emailResult)

    return { success: true, data: emailResult }
  } catch (error) {
    console.error("[v0] Invitation error:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}
