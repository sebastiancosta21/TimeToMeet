"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, CheckSquare, LogOut, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { signOut } from "@/lib/actions"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import TaskDetailDialog from "@/components/task-detail-dialog"
import NavigationTabs from "@/components/navigation-tabs"

interface Todo {
  id: string
  title: string
  description: string
  due_date: string | null
  status: "pending" | "done"
  meeting_id: string
  assigned_to: string
  created_by: string
  meetings: {
    title: string
  }
}

interface MyTasksViewProps {
  user: SupabaseUser
}

export default function MyTasksView({ user }: MyTasksViewProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)

  useEffect(() => {
    fetchTodos()
  }, [])

  const fetchTodos = async () => {
    try {
      const { data, error } = await supabase
        .from("todos")
        .select(`
          *,
          meetings (
            title
          )
        `)
        .eq("assigned_to", user.id)
        .order("due_date", { ascending: true, nullsFirst: false })

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

  const pendingTodos = todos.filter((todo) => todo.status === "pending")
  const completedTodos = todos.filter((todo) => todo.status === "done")

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
        <div className="mb-6">
          <h2 className="text-3xl font-bold font-work-sans text-foreground">My Tasks</h2>
          <p className="text-muted-foreground mt-2">All tasks assigned to you across all meetings</p>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        ) : todos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No tasks assigned</h3>
              <p className="text-muted-foreground">Tasks will appear here when assigned to you in meetings.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pending Tasks */}
            {pendingTodos.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold font-work-sans text-foreground mb-4">
                  Pending Tasks ({pendingTodos.length})
                </h3>
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
                        {pendingTodos.map((todo) => {
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
              </div>
            )}

            {/* Completed Tasks */}
            {completedTodos.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold font-work-sans text-foreground mb-4">
                  Completed Tasks ({completedTodos.length})
                </h3>
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
                        {completedTodos.map((todo) => {
                          const dueDateInfo = formatDueDate(todo.due_date)
                          return (
                            <div
                              key={todo.id}
                              onClick={() => handleTaskClick(todo)}
                              className="grid grid-cols-12 gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-l-4 border-l-green-500/20 opacity-75"
                            >
                              <div className="col-span-6">
                                <div className="font-medium text-foreground truncate line-through">{todo.title}</div>
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
                                  <div className="text-xs px-2 py-1 rounded flex items-center bg-green-100 text-green-700">
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
              </div>
            )}
          </div>
        )}
      </main>

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
