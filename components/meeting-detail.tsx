"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Users,
  CheckSquare,
  MessageSquare,
  Settings,
  ArrowLeft,
  Clock,
  MapPin,
  FileText,
  StopCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import MeetingSettings from "@/components/meeting-settings"
import ParticipantsTab from "@/components/participants-tab"
import TodosTab from "@/components/todos-tab"
import DiscussionItemsTab from "@/components/discussion-items-tab"
import MeetingSummaryTab from "@/components/meeting-summary-tab"
import { endMeeting } from "@/lib/actions"
import { Loader2 } from "lucide-react"

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
  is_recurring?: boolean
}

interface MeetingDetailProps {
  meeting: Meeting
  user: User
  isCreator: boolean
}

export default function MeetingDetail({ meeting, user, isCreator }: MeetingDetailProps) {
  const [activeTab, setActiveTab] = useState("participants")
  const [showSettings, setShowSettings] = useState(false)
  const [participants, setParticipants] = useState([])
  const [todos, setTodos] = useState([])
  const [discussionItems, setDiscussionItems] = useState([])
  const [endingMeeting, setEndingMeeting] = useState(false)
  const [currentMeeting, setCurrentMeeting] = useState(meeting)

  useEffect(() => {
    fetchMeetingData()
  }, [meeting.id])

  const fetchMeetingData = async () => {
    // Fetch updated meeting data
    const { data: meetingData } = await supabase.from("meetings").select("*").eq("id", meeting.id).single()

    if (meetingData) {
      setCurrentMeeting(meetingData)
    }

    // Fetch participants
    const { data: participantsData } = await supabase
      .from("meeting_participants")
      .select(`
        *,
        profiles:user_id (
          id,
          email,
          full_name
        )
      `)
      .eq("meeting_id", meeting.id)

    // Fetch todos
    const { data: todosData } = await supabase
      .from("todos")
      .select(`
        *,
        assigned_user:assigned_to (
          id,
          email,
          full_name
        ),
        creator:created_by (
          id,
          email,
          full_name
        )
      `)
      .eq("meeting_id", meeting.id)
      .order("created_at", { ascending: false })

    // Fetch discussion items
    const { data: discussionData } = await supabase
      .from("discussion_items")
      .select(`
        *,
        creator:created_by (
          id,
          email,
          full_name
        )
      `)
      .eq("meeting_id", meeting.id)
      .eq("status", "pending")
      .order("order_index", { ascending: true })

    setParticipants(participantsData || [])
    setTodos(todosData || [])
    setDiscussionItems(discussionData || [])
  }

  const handleEndMeeting = async () => {
    if (!isCreator || (currentMeeting.status === "ended" && !currentMeeting.is_recurring)) return

    setEndingMeeting(true)

    try {
      const result = await endMeeting(meeting.id)

      if (result.error) {
        console.error("Error ending meeting:", result.error)
        alert("Failed to end meeting: " + result.error)
      } else {
        if (result.isRecurring) {
          alert("Meeting summary sent successfully! This recurring meeting is ready to be run again.")
        } else {
          alert("Meeting ended successfully! Summary emails have been sent to all participants.")
        }
        fetchMeetingData() // Refresh meeting data
      }
    } catch (error) {
      console.error("Error ending meeting:", error)
      alert("Failed to end meeting. Please try again.")
    } finally {
      setEndingMeeting(false)
    }
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

  const pendingTodos = todos.filter((todo: any) => todo.status === "pending")
  const completedTodos = todos.filter((todo: any) => todo.status === "done")
  const isEnded = currentMeeting.status === "ended" && !currentMeeting.is_recurring

  if (showSettings) {
    return (
      <MeetingSettings
        meeting={currentMeeting}
        onBack={() => setShowSettings(false)}
        onMeetingUpdated={fetchMeetingData}
        isCreator={isCreator}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold font-work-sans text-foreground">{currentMeeting.title}</h1>
                  {currentMeeting.is_recurring && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Recurring
                    </Badge>
                  )}
                  {isEnded && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      Ended
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{currentMeeting.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCreator && !isEnded && (
                <Button variant="destructive" size="sm" onClick={handleEndMeeting} disabled={endingMeeting}>
                  {endingMeeting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {currentMeeting.is_recurring ? "Sending..." : "Ending..."}
                    </>
                  ) : (
                    <>
                      <StopCircle className="h-4 w-4 mr-2" />
                      {currentMeeting.is_recurring ? "Send Summary" : "End Meeting"}
                    </>
                  )}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Meeting Info Banner */}
      <div className="bg-primary/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center text-foreground">
              <Calendar className="h-4 w-4 mr-2 text-primary" />
              {formatDate(currentMeeting.scheduled_date)}
            </div>
            <div className="flex items-center text-foreground">
              <Clock className="h-4 w-4 mr-2 text-primary" />
              {formatTime(currentMeeting.scheduled_time)} ({currentMeeting.duration_minutes} min)
            </div>
            {currentMeeting.location && (
              <div className="flex items-center text-foreground">
                <MapPin className="h-4 w-4 mr-2 text-primary" />
                {currentMeeting.location}
              </div>
            )}
            <div className="flex items-center text-foreground">
              <Users className="h-4 w-4 mr-2 text-primary" />
              {participants.length} participant{participants.length !== 1 ? "s" : ""}
            </div>
            {isEnded && currentMeeting.ended_at && (
              <div className="flex items-center text-red-600">
                <StopCircle className="h-4 w-4 mr-2" />
                Ended {new Date(currentMeeting.ended_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="participants" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Participants
              <Badge variant="secondary" className="ml-1">
                {participants.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              To-Dos
              <Badge variant="secondary" className="ml-1">
                {pendingTodos.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="discussion" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Discussion Items
              <Badge variant="secondary" className="ml-1">
                {discussionItems.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participants">
            <ParticipantsTab
              meetingId={currentMeeting.id}
              participants={participants}
              isCreator={isCreator}
              onParticipantsUpdated={fetchMeetingData}
            />
          </TabsContent>

          <TabsContent value="todos">
            <TodosTab
              meetingId={currentMeeting.id}
              todos={todos}
              participants={participants}
              currentUser={user}
              onTodosUpdated={fetchMeetingData}
            />
          </TabsContent>

          <TabsContent value="discussion">
            <DiscussionItemsTab
              meetingId={currentMeeting.id}
              discussionItems={discussionItems}
              currentUser={user}
              onDiscussionItemsUpdated={fetchMeetingData}
            />
          </TabsContent>

          <TabsContent value="summary">
            <MeetingSummaryTab meetingId={currentMeeting.id} meeting={currentMeeting} currentUser={user} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
