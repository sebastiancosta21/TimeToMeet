"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Plus, Mail, UserPlus, Trash2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

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
  const [newParticipantEmail, setNewParticipantEmail] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newParticipantEmail.trim() || !isCreator) return

    setLoading(true)

    try {
      // Check if user exists in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newParticipantEmail.trim())
        .single()

      const { error } = await supabase.from("meeting_participants").insert({
        meeting_id: meetingId,
        user_id: profile?.id || null,
        email: newParticipantEmail.trim(),
        role: "participant",
        status: "pending",
      })

      if (error) throw error

      setNewParticipantEmail("")
      onParticipantsUpdated()
    } catch (error) {
      console.error("Error adding participant:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveParticipant = async (participantId: string) => {
    if (!isCreator) return

    try {
      const { error } = await supabase.from("meeting_participants").delete().eq("id", participantId)

      if (error) throw error

      onParticipantsUpdated()
    } catch (error) {
      console.error("Error removing participant:", error)
    }
  }

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
      {/* Add Participant Form */}
      {isCreator && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-work-sans">
              <UserPlus className="h-5 w-5 text-primary" />
              Invite Participants
            </CardTitle>
            <CardDescription>Add team members to this meeting</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddParticipant} className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter email address"
                value={newParticipantEmail}
                onChange={(e) => setNewParticipantEmail(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-work-sans">Meeting Participants</CardTitle>
          <CardDescription>
            {participants.length} participant{participants.length !== 1 ? "s" : ""} invited
          </CardDescription>
        </CardHeader>
        <CardContent>
          {participants.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No participants yet</h3>
              <p className="text-muted-foreground">
                {isCreator
                  ? "Start by inviting team members to this meeting"
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
                    {isCreator && participant.role !== "organizer" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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
