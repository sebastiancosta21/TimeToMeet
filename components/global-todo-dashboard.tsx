"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, CheckSquare, Square, ArrowLeft, Clock, Users } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { signOut } from "@/lib/actions"
import Link from "next/link"
import type { User } from "@supabase/supabase-js"

interface Todo {
  id: string
  title: string
  description: string
  status: string
  due_date: string
  assigned_to: string
  assigned_email: string
  created_by: string
  created_at: string
  meeting_id: string
  meetings: {
    id: string
    title: string
    scheduled_date: string
    scheduled_time: string
    location: string
  }
  assigned_user?: {
    id: string
    email: string
    full_name: string
  }
  creator?: {
    id: string
    email: string
    full_name: string
  }
}

interface GlobalTodoDashboardProps {
  user: User
}

export default function GlobalTodoDashboard({ user }: GlobalTodoDashboardProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("assigned")

  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    try {
      // Fetch todos where user is assigned or created
      const { data, error } = await supabase
        .from("todos")
        .select(`
          *,
          meetings:meeting_id (
            id,
            title,
            scheduled_date,
            scheduled_time,
            location
          ),
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
        .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
        .order("due_date", { ascending: true, nullsLast: true })

      if (error) throw error
      setTodos(data || [])
    } catch (error) {
      console.error("Error fetching todos:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTodo = async (todoId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "pending" ? "done" : "pending"
      const { error } = await supabase.from("todos").update({ status: newStatus }).eq("id", todoId)

      if (error) throw error
      fetchTodos()
    } catch (error) {
      console.error("Error updating todo:", error)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatMeetingDate = (date: string, time: string) => {
    const meetingDate = new Date(`${date}T${time}`)
    return meetingDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })
  }

  const formatMeetingTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
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

  // Filter todos based on active tab
  const assignedTodos = todos.filter((todo) => todo.assigned_to === user.id)
  const createdTodos = todos.filter((todo) => todo.created_by === user.id)
  const pendingAssigned = assignedTodos.filter((todo) => todo.status === "pending")
  const completedAssigned = assignedTodos.filter((todo) => todo.status === "done")
  const pendingCreated = createdTodos.filter((todo) => todo.status === "pending")
  const completedCreated = createdTodos.filter((todo) => todo.status === "done")

  const renderTodoCard = (todo: Todo, showMeeting = true) => (
    <Card key={todo.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-6 w-6 mt-1"
            onClick={() => handleToggleTodo(todo.id, todo.status)}
          >
            {todo.status === "done" ? (
              <CheckSquare className="h-4 w-4 text-green-600" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <div className="flex-1">
            <h4
              className={`font-medium ${todo.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}
            >
              {todo.title}
            </h4>
            {todo.description && (
              <p
                className={`text-sm mt-1 ${todo.status === "done" ? "line-through text-muted-foreground" : "text-muted-foreground"}`}
              >
                {todo.description}
              </p>
            )}

            {/* Meeting info */}
            {showMeeting && todo.meetings && (
              <Link href={`/meetings/${todo.meetings.id}`}>
                <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md hover:bg-muted transition-colors">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span className="text-xs font-medium text-foreground">{todo.meetings.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatMeetingDate(todo.meetings.scheduled_date, todo.meetings.scheduled_time)}
                  </span>
                </div>
              </Link>
            )}

            <div className="flex items-center gap-4 mt-3">
              {/* Assignee info */}
              {todo.assigned_user && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(todo.assigned_user.full_name || "", todo.assigned_user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{todo.assigned_user.full_name || todo.assigned_user.email}</span>
                </div>
              )}

              {/* Due date */}
              {todo.due_date && (
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="h-3 w-3" />
                  <span
                    className={
                      isOverdue(todo.due_date) && todo.status === "pending"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                  >
                    {formatDate(todo.due_date)}
                  </span>
                  {isOverdue(todo.due_date) && todo.status === "pending" && (
                    <Badge variant="destructive" className="text-xs">
                      Overdue
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

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
                <h1 className="text-xl font-bold font-work-sans text-foreground">My Tasks</h1>
                <p className="text-sm text-muted-foreground">All tasks from your meetings</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.email}</span>
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assigned to Me</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingAssigned.length}</div>
              <p className="text-xs text-muted-foreground">{completedAssigned.length} completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Created by Me</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCreated.length}</div>
              <p className="text-xs text-muted-foreground">{completedCreated.length} completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <Clock className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {todos.filter((todo) => todo.due_date && isOverdue(todo.due_date) && todo.status === "pending").length}
              </div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todos.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assigned" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Assigned to Me
              <Badge variant="secondary" className="ml-1">
                {pendingAssigned.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="created" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Created by Me
              <Badge variant="secondary" className="ml-1">
                {pendingCreated.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned">
            <div className="space-y-6">
              {/* Pending Tasks */}
              <div>
                <h3 className="text-lg font-semibold font-work-sans text-foreground mb-4">
                  Pending Tasks ({pendingAssigned.length})
                </h3>
                {pendingAssigned.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No pending tasks</h3>
                      <p className="text-muted-foreground">All your assigned tasks are completed!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingAssigned.map((todo) => renderTodoCard(todo))}
                  </div>
                )}
              </div>

              {/* Completed Tasks */}
              {completedAssigned.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold font-work-sans text-foreground mb-4">
                    Completed Tasks ({completedAssigned.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedAssigned.slice(0, 6).map((todo) => renderTodoCard(todo))}
                  </div>
                  {completedAssigned.length > 6 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Showing 6 of {completedAssigned.length} completed tasks
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="created">
            <div className="space-y-6">
              {/* Pending Tasks */}
              <div>
                <h3 className="text-lg font-semibold font-work-sans text-foreground mb-4">
                  Pending Tasks ({pendingCreated.length})
                </h3>
                {pendingCreated.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">No pending tasks</h3>
                      <p className="text-muted-foreground">All tasks you created are completed!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pendingCreated.map((todo) => renderTodoCard(todo))}
                  </div>
                )}
              </div>

              {/* Completed Tasks */}
              {completedCreated.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold font-work-sans text-foreground mb-4">
                    Completed Tasks ({completedCreated.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completedCreated.slice(0, 6).map((todo) => renderTodoCard(todo))}
                  </div>
                  {completedCreated.length > 6 && (
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Showing 6 of {completedCreated.length} completed tasks
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
