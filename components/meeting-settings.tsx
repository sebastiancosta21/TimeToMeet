"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Calendar, Clock, MapPin, Save, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import { closeMeeting } from "@/lib/actions"

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
  const [formData, setFormData] = useState({
    title: meeting.title,
    description: meeting.description || "",
    scheduled_date: meeting.scheduled_date,
    scheduled_time: meeting.scheduled_time,
    duration_minutes: meeting.duration_minutes,
    location: meeting.location || "",
  })

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

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

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
            {isCreator && (
              <Button variant="destructive" size="sm" onClick={handleCloseMeeting} disabled={closingMeeting}>
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
            )}
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
                    <div className="font-medium text-sm">{formatDate(meeting.scheduled_date)}</div>
                    <div className="text-xs text-muted-foreground">Date</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <Clock className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-medium text-sm">
                      {formatTime(meeting.scheduled_time)} ({meeting.duration_minutes} min)
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
          <div className="lg:col-span-2">
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
                        onChange={(e) => handleChange("title", e.target.value)}
                        disabled={!isCreator}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => handleChange("description", e.target.value)}
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
                          onChange={(e) => handleChange("scheduled_date", e.target.value)}
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
                          onChange={(e) => handleChange("scheduled_time", e.target.value)}
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
                          onChange={(e) => handleChange("duration_minutes", Number.parseInt(e.target.value))}
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
                          onChange={(e) => handleChange("location", e.target.value)}
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
