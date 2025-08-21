"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Clock, MapPin, Save, X, UserPlus, Mail, RotateCcw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { closeMeeting, inviteParticipant } from "@/lib/actions"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface Meeting {
  id: string
  title: string
  description: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes: number
  location: string
  created_by: string
  created_at: string
  status?: string
  ended_at?: string
}

interface MeetingSettingsProps {
  meeting: Meeting
  onBack: () => void
  onMeetingUpdated: () => void
  isCreator: boolean
}

export default function MeetingSettings({ meeting, onBack, onMeetingUpdated, isCreator }: MeetingSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [closingMeeting, setClosingMeeting] = useState(false)
  const [participants, setParticipants] = useState<any[]>([])
  const [newParticipantEmail, setNewParticipantEmail] = useState("")
  const [invitingParticipant, setInvitingParticipant] = useState(false)
  const [resendingInvite, setResendingInvite] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("")
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    fetchParticipants()
    getCurrentUser()
  }, [meeting.id])

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from("meeting_participants")
        .select(`
          id,
          email,
          role,
          status,
          profiles (
            id,
            email,
            full_name
          )
        `)
        .eq("meeting_id", meeting.id)

      if (error) throw error
      setParticipants(data || [])
    } catch (error) {
      console.error("Error fetching participants:", error)
    }
  }

  const getCurrentUser = async () => {
    try {
      if (!supabase) {
        console.error("[v0] Supabase client is undefined in getCurrentUser")
        return
      }

      console.log("[v0] Getting current user with supabase client:", !!supabase.auth)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user?.email) {
        setCurrentUserEmail(user.email)
      }
    } catch (error) {
      console.error("Error getting current user:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isCreator) return

    setLoading(true)

    try {
      const { error } = await supabase.from("meetings").update(formData).eq("id", meeting.id)

      if (error) throw error

      onMeetingUpdated()
      onBack()
    } catch (error) {
      console.error("Error updating meeting:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCloseMeeting = async () => {
    if (!isCreator) return

    setClosingMeeting(true)

    try {
      const result = await closeMeeting(meeting.id)

      if (result.error) {
        console.error("Error closing meeting:", result.error)
        alert("Failed to close meeting: " + result.error)
      } else {
        alert("Meeting closed successfully! It will no longer appear in your upcoming meetings list.")
        onMeetingUpdated()
        onBack()
      }
    } catch (error) {
      console.error("Error closing meeting:", error)
      alert("Failed to close meeting. Please try again.")
    } finally {
      setClosingMeeting(false)
    }
  }

  const handleInviteParticipant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newParticipantEmail.trim() || !isCreator) return

    setInvitingParticipant(true)

    try {
      console.log("[v0] Starting participant invitation for:", newParticipantEmail.trim())
      const result = await inviteParticipant(meeting.id, newParticipantEmail.trim())

      if (result.error) {
        alert("Failed to invite participant: " + result.error)
      } else {
        setNewParticipantEmail("")
        fetchParticipants()
        alert("Invitation sent successfully!")
      }
    } catch (error) {
      console.error("Error inviting participant:", error)
      alert("Failed to invite participant")
    } finally {
      setInvitingParticipant(false)
    }
  }

  const handleResendInvitation = async (participantEmail: string) => {
    if (!isCreator) return

    setResendingInvite(participantEmail)

    try {
      const result = await inviteParticipant(meeting.id, participantEmail)

      if (result.error) {
        alert("Failed to resend invitation: " + result.error)
      } else {
        alert("Invitation resent successfully!")
      }
    } catch (error) {
      console.error("Error resending invitation:", error)
      alert("Failed to resend invitation")
    } finally {
      setResendingInvite(null)
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

  const allParticipants = participants.filter((p) => p.email !== currentUserEmail)
  const currentParticipants = allParticipants.filter((p) => p.profiles?.id)
  const pendingParticipants = allParticipants.filter((p) => !p.profiles?.id)

  const [formData, setFormData] = useState({
    title: meeting.title,
    description: meeting.description || "",
    scheduled_date: meeting.scheduled_date,
    scheduled_time: meeting.scheduled_time,
    duration_minutes: meeting.duration_minutes,
    location: meeting.location || "",
  })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" className="mr-4" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Meeting
              </Button>
              <h1 className="text-xl font-bold font-work-sans text-foreground">Meeting Settings</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Schedule Info Card */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-work-sans">
                  <Calendar className="h-5 w-5 text-primary" />
                  Schedule
                </CardTitle>
                <CardDescription>Current meeting schedule</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-sm">
                      {new Date(meeting.scheduled_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">Date</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-sm">
                      {new Date(`2000-01-01T${meeting.scheduled_time}`).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}{" "}
                      ({meeting.duration_minutes} min)
                    </div>
                    <div className="text-xs text-muted-foreground">Time & Duration</div>
                  </div>
                </div>
                {meeting.location && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <MapPin className="h-4 w-4 text-primary" />
                    <div>
                      <div className="font-medium text-sm">{meeting.location}</div>
                      <div className="text-xs text-muted-foreground">Location</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {isCreator && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-work-sans text-red-600">
                    <X className="h-5 w-5" />
                    Close Meeting
                  </CardTitle>
                  <CardDescription>Remove this meeting from your upcoming meetings list</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will close the meeting and remove it from your upcoming meetings list. The meeting data will be
                    preserved but it won't appear in your active meetings.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={handleCloseMeeting}
                    disabled={closingMeeting}
                    className="w-full"
                  >
                    {closingMeeting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Closing Meeting...
                      </>
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-2" />
                        Close Meeting
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Participant Management Section */}
            {isCreator && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-work-sans">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Manage Participants
                  </CardTitle>
                  <CardDescription>Invite and manage meeting participants</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Invite Form */}
                  <form onSubmit={handleInviteParticipant} className="flex gap-3">
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={newParticipantEmail}
                      onChange={(e) => setNewParticipantEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={invitingParticipant} className="bg-primary hover:bg-primary/90">
                      {invitingParticipant ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4 mr-2" />
                      )}
                      Invite
                    </Button>
                  </form>

                  {/* Current Participants */}
                  {currentParticipants.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-3">
                        Current Participants ({currentParticipants.length})
                      </h4>
                      <div className="space-y-2">
                        {currentParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-3 border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getInitials(participant.profiles?.full_name || "", participant.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">
                                  {participant.profiles?.full_name || participant.email}
                                </div>
                                {participant.profiles?.full_name && (
                                  <div className="text-xs text-muted-foreground">{participant.email}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(participant.status)} variant="secondary">
                                {participant.status}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {participant.role}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pending Participants */}
                  {pendingParticipants.length > 0 && (
                    <div>
                      <h4 className="font-medium text-foreground mb-3">
                        Pending Participants ({pendingParticipants.length})
                      </h4>
                      <div className="space-y-2">
                        {pendingParticipants.map((participant) => (
                          <div
                            key={participant.id}
                            className="flex items-center justify-between p-3 border border-border rounded-lg bg-yellow-50"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-yellow-100 text-yellow-800 text-xs">
                                  <Mail className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">{participant.email}</div>
                                <div className="text-xs text-muted-foreground">Invitation sent - no account yet</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-yellow-100 text-yellow-800" variant="secondary">
                                pending
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResendInvitation(participant.email)}
                                disabled={resendingInvite === participant.email}
                                className="text-primary hover:text-primary"
                              >
                                {resendingInvite === participant.email ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allParticipants.length === 0 && (
                    <div className="text-center py-6">
                      <Mail className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No participants invited yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="font-work-sans">Meeting Details</CardTitle>
                <CardDescription>
                  {isCreator ? "Update your meeting information" : "View meeting information (read-only)"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Meeting Title</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                        disabled={!isCreator}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                        disabled={!isCreator}
                        rows={3}
                        placeholder="Brief description of the meeting purpose"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="scheduled_date">Date</Label>
                        <Input
                          id="scheduled_date"
                          type="date"
                          value={formData.scheduled_date}
                          onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_date: e.target.value }))}
                          disabled={!isCreator}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="scheduled_time">Time</Label>
                        <Input
                          id="scheduled_time"
                          type="time"
                          value={formData.scheduled_time}
                          onChange={(e) => setFormData((prev) => ({ ...prev, scheduled_time: e.target.value }))}
                          disabled={!isCreator}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                        <Input
                          id="duration_minutes"
                          type="number"
                          value={formData.duration_minutes}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, duration_minutes: Number.parseInt(e.target.value) }))
                          }
                          disabled={!isCreator}
                          min="15"
                          step="15"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                          disabled={!isCreator}
                          placeholder="Conference Room A"
                        />
                      </div>
                    </div>

                    {isCreator && (
                      <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="outline" onClick={onBack}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
