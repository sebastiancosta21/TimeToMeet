import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components"

interface MeetingSummaryProps {
  meetingTitle: string
  meetingDate: string
  discussionItems: Array<{ title: string; description?: string }>
  todos: Array<{ title: string; assigned_to_email: string; due_date?: string }>
}

export default function MeetingSummary({ meetingTitle, meetingDate, discussionItems, todos }: MeetingSummaryProps) {
  return (
    <Html>
      <Head />
      <Preview>Meeting Summary: {meetingTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Meeting Summary</Heading>
          <Text style={text}>Here's a summary of the meeting that concluded today.</Text>

          <Section style={meetingDetails}>
            <Heading style={h2}>{meetingTitle}</Heading>
            <Text style={detailText}>
              <strong>Date:</strong> {meetingDate}
            </Text>
          </Section>

          {discussionItems.length > 0 && (
            <Section>
              <Heading style={h3}>Items Discussed</Heading>
              {discussionItems.map((item, index) => (
                <Section key={index} style={listItem}>
                  <Text style={itemTitle}>{item.title}</Text>
                  {item.description && <Text style={itemDescription}>{item.description}</Text>}
                </Section>
              ))}
            </Section>
          )}

          {todos.length > 0 && (
            <Section>
              <Heading style={h3}>Action Items</Heading>
              {todos.map((todo, index) => (
                <Section key={index} style={listItem}>
                  <Text style={itemTitle}>{todo.title}</Text>
                  <Text style={itemDescription}>Assigned to: {todo.assigned_to_email}</Text>
                  {todo.due_date && <Text style={itemDescription}>Due: {todo.due_date}</Text>}
                </Section>
              ))}
            </Section>
          )}

          <Text style={footer}>Thank you for participating in this meeting.</Text>
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

const h3 = {
  color: "#374151",
  fontSize: "18px",
  fontWeight: "600",
  margin: "24px 0 12px 0",
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

const listItem = {
  margin: "16px 0",
  paddingLeft: "20px",
  borderLeft: "3px solid #059669",
}

const itemTitle = {
  color: "#374151",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 4px 0",
}

const itemDescription = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "2px 0",
}

const footer = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "1.5",
  marginTop: "30px",
}
