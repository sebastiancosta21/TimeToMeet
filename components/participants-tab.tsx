"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Mail, Users } from "lucide-react"

interface Participant {
  id: string
  email: string
  role: string
  status: string
  profiles?: {
    id: string
    email: string
    full_name: string
  }
}

interface ParticipantsTabProps {
  meetingId: string
  participants: Participant[]
  isCreator: boolean
  onParticipantsUpdated: () => void
}

export default function ParticipantsTab({
  meetingId,
  participants,
  isCreator,
  onParticipantsUpdated,
}: ParticipantsTabProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800"
      case "declined":
        return "bg-red-100 text-red-800"
      default:
        return "bg-yellow-100 text-yellow-800"
    }
  }

  const getInitials = (name: string, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-work-sans">
            <Users className="h-5 w-5 text-primary" />
            Meeting Participants
          </CardTitle>
          <CardDescription>
            {participants.length} participant{participants.length !== 1 ? "s" : ""} invited
            {isCreator && " • Manage participants in Settings"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No participants yet</h3>
              <p className="text-muted-foreground">
                {isCreator
                  ? "Go to Settings to invite team members to this meeting"
                  : "The meeting organizer hasn't added participants yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(participant.profiles?.full_name || "", participant.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">
                        {participant.profiles?.full_name || participant.email}
                      </div>
                      {participant.profiles?.full_name && (
                        <div className="text-sm text-muted-foreground">{participant.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(participant.status)}>{participant.status}</Badge>
                    <Badge variant="outline">{participant.role}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
