"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, Calendar, FileText } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface MeetingSummaryTabProps {
  meetingId: string
  meeting: any
  currentUser: SupabaseUser
}

export default function MeetingSummaryTab({ meetingId, meeting, currentUser }: MeetingSummaryTabProps) {
  const [completedDiscussionItems, setCompletedDiscussionItems] = useState([])
  const [meetingTodos, setMeetingTodos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummaryData()
  }, [meetingId])

  const fetchSummaryData = async () => {
    try {
      // Fetch completed discussion items
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
        .eq("meeting_id", meetingId)
        .eq("status", "done")
        .order("updated_at", { ascending: false })

      // Fetch all todos created for this meeting
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
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false })

      setCompletedDiscussionItems(discussionData || [])
      setMeetingTodos(todosData || [])
    } catch (error) {
      console.error("Error fetching summary data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const pendingTodos = meetingTodos.filter((todo: any) => todo.status === "pending")
  const completedTodos = meetingTodos.filter((todo: any) => todo.status === "done")

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meeting summary...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Meeting Summary
          </CardTitle>
          <CardDescription>Overview of items discussed and action items created during this meeting</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-2xl font-bold text-primary">{completedDiscussionItems.length}</div>
              <div className="text-sm text-muted-foreground">Items Discussed</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{completedTodos.length}</div>
              <div className="text-sm text-muted-foreground">Completed Tasks</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{pendingTodos.length}</div>
              <div className="text-sm text-muted-foreground">Pending Tasks</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completed Discussion Items */}
      {completedDiscussionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Items Discussed ({completedDiscussionItems.length})
            </CardTitle>
            <CardDescription>Discussion topics that were completed during the meeting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedDiscussionItems.map((item: any) => (
                <div key={item.id} className="border border-border rounded-lg p-4 bg-green-50/50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">{item.title}</h4>
                      {item.description && <p className="text-sm text-muted-foreground mb-2">{item.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {item.creator?.full_name || item.creator?.email || "Unknown"}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Completed {formatDate(item.updated_at)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Discussed
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Items Created */}
      {meetingTodos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Action Items Created ({meetingTodos.length})
            </CardTitle>
            <CardDescription>Tasks and action items assigned during this meeting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {meetingTodos.map((todo: any) => (
                <div
                  key={todo.id}
                  className={`border border-border rounded-lg p-4 ${
                    todo.status === "done" ? "bg-green-50/50" : "bg-background"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground mb-1">{todo.title}</h4>
                      {todo.description && <p className="text-sm text-muted-foreground mb-2">{todo.description}</p>}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Assigned to: {todo.assigned_user?.full_name || todo.assigned_email || "Unassigned"}
                        </div>
                        {todo.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Due: {new Date(todo.due_date).toLocaleDateString()}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Created {formatDate(todo.created_at)}
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={todo.status === "done" ? "default" : "secondary"}
                      className={
                        todo.status === "done" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"
                      }
                    >
                      {todo.status === "done" ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {completedDiscussionItems.length === 0 && meetingTodos.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Summary Available</h3>
            <p className="text-muted-foreground">
              No discussion items have been completed and no action items have been created for this meeting yet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
