import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendMeetingInvitation({
  to,
  meetingTitle,
  meetingDate,
  meetingTime,
  location,
  inviterName,
  meetingId,
}: {
  to: string
  meetingTitle: string
  meetingDate: string
  meetingTime: string
  location?: string
  inviterName: string
  meetingId: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: "meetings@yourdomain.com", // Replace with your verified domain
      to: [to],
      subject: `Meeting Invitation: ${meetingTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Meeting Invitation</h2>
          <p>You've been invited to a meeting by <strong>${inviterName}</strong></p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">${meetingTitle}</h3>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${meetingDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${meetingTime}</p>
            ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ""}
          </div>
          
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/meetings/${meetingId}" 
             style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Meeting Details
          </a>
          
          <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
            If you can't click the button, copy and paste this link: ${process.env.NEXT_PUBLIC_SITE_URL}/meetings/${meetingId}
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending invitation:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error sending invitation:", error)
    return { success: false, error }
  }
}

export async function sendMeetingReminder({
  to,
  meetingTitle,
  meetingDate,
  meetingTime,
  location,
  meetingId,
}: {
  to: string
  meetingTitle: string
  meetingDate: string
  meetingTime: string
  location?: string
  meetingId: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: "meetings@yourdomain.com",
      to: [to],
      subject: `Reminder: ${meetingTitle} - Tomorrow`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Meeting Reminder</h2>
          <p>This is a reminder about your upcoming meeting tomorrow.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">${meetingTitle}</h3>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${meetingDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${meetingTime}</p>
            ${location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${location}</p>` : ""}
          </div>
          
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/meetings/${meetingId}" 
             style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Meeting Details
          </a>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending reminder:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error sending reminder:", error)
    return { success: false, error }
  }
}

export async function sendMeetingSummary({
  to,
  meetingTitle,
  meetingDate,
  discussionItems,
  todos,
}: {
  to: string[]
  meetingTitle: string
  meetingDate: string
  discussionItems: Array<{ title: string; description?: string }>
  todos: Array<{ title: string; assigned_to_email: string; due_date?: string }>
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: "meetings@yourdomain.com",
      to,
      subject: `Meeting Summary: ${meetingTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Meeting Summary</h2>
          <p>Here's a summary of the meeting that concluded today.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">${meetingTitle}</h3>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${meetingDate}</p>
          </div>
          
          ${
            discussionItems.length > 0
              ? `
            <h3 style="color: #374151;">Items Discussed</h3>
            <ul style="padding-left: 20px;">
              ${discussionItems
                .map(
                  (item) => `
                <li style="margin: 10px 0;">
                  <strong>${item.title}</strong>
                  ${item.description ? `<br><span style="color: #6b7280;">${item.description}</span>` : ""}
                </li>
              `,
                )
                .join("")}
            </ul>
          `
              : ""
          }
          
          ${
            todos.length > 0
              ? `
            <h3 style="color: #374151;">Action Items</h3>
            <ul style="padding-left: 20px;">
              ${todos
                .map(
                  (todo) => `
                <li style="margin: 10px 0;">
                  <strong>${todo.title}</strong>
                  <br><span style="color: #6b7280;">Assigned to: ${todo.assigned_to_email}</span>
                  ${todo.due_date ? `<br><span style="color: #6b7280;">Due: ${todo.due_date}</span>` : ""}
                </li>
              `,
                )
                .join("")}
            </ul>
          `
              : ""
          }
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Thank you for participating in this meeting.
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("Error sending summary:", error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Error sending summary:", error)
    return { success: false, error }
  }
}
