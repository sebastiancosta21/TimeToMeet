import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components"

interface MeetingReminderProps {
  meetingTitle: string
  meetingDate: string
  meetingTime: string
  location?: string
  meetingId: string
  siteUrl: string
}

export default function MeetingReminder({
  meetingTitle,
  meetingDate,
  meetingTime,
  location,
  meetingId,
  siteUrl,
}: MeetingReminderProps) {
  return (
    <Html>
      <Head />
      <Preview>Reminder: {meetingTitle} - Tomorrow</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Meeting Reminder</Heading>
          <Text style={text}>This is a reminder about your upcoming meeting tomorrow.</Text>

          <Section style={meetingDetails}>
            <Heading style={h2}>{meetingTitle}</Heading>
            <Text style={detailText}>
              <strong>Date:</strong> {meetingDate}
            </Text>
            <Text style={detailText}>
              <strong>Time:</strong> {meetingTime}
            </Text>
            {location && (
              <Text style={detailText}>
                <strong>Location:</strong> {location}
              </Text>
            )}
          </Section>

          <Section style={buttonContainer}>
            <Button style={button} href={`${siteUrl}/meetings/${meetingId}`}>
              View Meeting Details
            </Button>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: "#ffffff",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "600px",
}

const h1 = {
  color: "#059669",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "1.25",
  margin: "16px 0",
}

const h2 = {
  color: "#374151",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0 0 10px 0",
}

const text = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "16px 0",
}

const detailText = {
  color: "#374151",
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "5px 0",
}

const meetingDetails = {
  backgroundColor: "#f3f4f6",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
}

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button = {
  backgroundColor: "#059669",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
}
