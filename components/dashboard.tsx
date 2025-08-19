"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Plus, CheckSquare, LogOut, ArrowRight, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { signOut } from "@/lib/actions"
import CreateMeetingDialog from "@/components/create-meeting-dialog"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import TaskDetailDialog from "@/components/task-detail-dialog"
import NavigationTabs from "@/components/navigation-tabs" // Added NavigationTabs component

interface Meeting {
  id: string
  title: string
  description: string
  scheduled_date: string
  scheduled_time: string
  duration_minutes: number
  location: string
  created_at: string
  status: "open" | "closed" | "recurring"
}

interface Todo {
  id: string
  title: string
  description: string
  due_date: string | null
  status: "pending" | "completed"
  meeting_id: string
  assigned_to: string
  created_by: string
  meetings: {
    title: string
  }
  order_index?: number // Added optional order_index field
}

interface DashboardProps {
  user: SupabaseUser
}

export default function Dashboard({ user }: DashboardProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [orderingEnabled, setOrderingEnabled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkOrderingSupport()
    fetchMeetings()
  }, [])

  const checkOrderingSupport = async () => {
    try {
      const { error: testError } = await supabase.from("todos").select("order_index").limit(1)
      setOrderingEnabled(!testError)

      // Fetch todos after determining ordering support
      fetchTodos(!testError)
    } catch (error) {
      console.log("Order index column not available")
      setOrderingEnabled(false)
      fetchTodos(false)
    }
  }

  const fetchMeetings = async () => {
    try {
      const { data, error } = await supabase
        .from("meetings")
        .select("*")
        .gte("scheduled_date", new Date().toISOString().split("T")[0])
        .neq("status", "closed")
        .order("scheduled_date", { ascending: true })
        .limit(5)

      if (error) {
        throw error
      }
      setMeetings(data || [])
    } catch (error) {
      console.error("Error fetching meetings:", error)
    }
  }

  const fetchTodos = async (useOrdering = orderingEnabled) => {
    try {
      let query = supabase
        .from("todos")
        .select(`
          *,
          meetings (
            title
          )
        `)
        .eq("assigned_to", user.id)
        .eq("status", "pending")

      if (useOrdering) {
        query = query.order("order_index", { ascending: true, nullsFirst: false })
      }

      query = query.order("due_date", { ascending: true, nullsFirst: false })

      const { data, error } = await query

      if (error) {
        throw error
      }
      setTodos(data || [])
    } catch (error) {
      console.error("Error fetching todos:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
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

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    const now = new Date()
    const isOverdue = date < now

    return {
      text: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      isOverdue,
    }
  }

  const handleTaskClick = (task: Todo) => {
    setSelectedTask(task)
    setShowTaskDialog(true)
  }

  const handleTaskUpdated = () => {
    fetchTodos()
    setSelectedTask(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-2xl font-bold font-work-sans text-foreground">MeetingHub</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.email}</span>
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <NavigationTabs />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold font-work-sans text-foreground">Dashboard</h2>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            New Meeting
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold font-work-sans text-foreground">My Tasks</h3>
              <Link href="/my-tasks">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Loading tasks...</div>
              </div>
            ) : todos.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No pending tasks</h3>
                  <p className="text-muted-foreground">
                    You're all caught up! Tasks will appear here when assigned to you.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
                      <div className="col-span-6">Task</div>
                      <div className="col-span-4">Meeting</div>
                      <div className="col-span-2">Due Date</div>
                    </div>

                    {/* Task Rows */}
                    <div className="divide-y">
                      {todos.map((todo) => {
                        const dueDateInfo = formatDueDate(todo.due_date)
                        return (
                          <div
                            key={todo.id}
                            onClick={() => handleTaskClick(todo)}
                            className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-l-4 border-l-primary/20"
                          >
                            <div className="col-span-6">
                              <div className="font-medium text-foreground truncate">{todo.title}</div>
                              {todo.description && (
                                <div className="text-sm text-muted-foreground truncate mt-1">{todo.description}</div>
                              )}
                            </div>

                            <div className="col-span-4 flex items-center">
                              <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground truncate">{todo.meetings?.title}</span>
                            </div>

                            <div className="col-span-2 flex items-center">
                              {dueDateInfo && (
                                <div
                                  className={`text-xs px-2 py-1 rounded flex items-center ${
                                    dueDateInfo.isOverdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  {dueDateInfo.text}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-1">
            <h3 className="text-xl font-semibold font-work-sans text-foreground mb-4">Upcoming Meetings</h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Loading...</div>
              </div>
            ) : meetings.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6">
                  <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-3">No upcoming meetings</p>
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Create Meeting
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <Link key={meeting.id} href={`/meetings/${meeting.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-foreground text-sm">{meeting.title}</h4>
                          {meeting.status === "recurring" && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Recurring</span>
                          )}
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-2" />
                            {formatDate(meeting.scheduled_date)}
                          </div>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-2" />
                            {formatTime(meeting.scheduled_time)}
                          </div>
                          {meeting.location && (
                            <div className="flex items-center">
                              <span className="h-3 w-3 mr-2">📍</span>
                              <span className="truncate">{meeting.location}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <CreateMeetingDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onMeetingCreated={fetchMeetings}
      />

      <TaskDetailDialog
        task={selectedTask}
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskUpdated}
        currentUserId={user.id}
      />
    </div>
  )
}
