import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components"

interface MeetingInvitationProps {
  meetingTitle: string
  meetingDate: string
  meetingTime: string
  location?: string
  inviterName: string
  meetingId: string
  siteUrl: string
}

export default function MeetingInvitation({
  meetingTitle,
  meetingDate,
  meetingTime,
  location,
  inviterName,
  meetingId,
  siteUrl,
}: MeetingInvitationProps) {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to: {meetingTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Meeting Invitation</Heading>
          <Text style={text}>
            You've been invited to a meeting by <strong>{inviterName}</strong>
          </Text>

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

          <Text style={footer}>
            If you can't click the button, copy and paste this link: {siteUrl}/meetings/{meetingId}
          </Text>
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

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.5",
  marginTop: "20px",
}
