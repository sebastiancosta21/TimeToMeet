"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, CheckSquare, LogOut, Clock, Plus, GripVertical, Info } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { signOut } from "@/lib/actions"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import TaskDetailDialog from "@/components/task-detail-dialog"
import NavigationTabs from "@/components/navigation-tabs"
import AddTaskDialog from "@/components/add-task-dialog"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface Todo {
  id: string
  title: string
  description: string
  due_date: string | null
  status: "pending" | "done"
  meeting_id: string | null
  assigned_to: string
  created_by: string
  order_index?: number
  meetings?: {
    title: string
  } | null
}

interface MyTasksViewProps {
  user: SupabaseUser
}

function SortableTaskRow({
  todo,
  onTaskClick,
  formatDueDate,
  orderingEnabled,
}: {
  todo: Todo
  onTaskClick: (task: Todo) => void
  formatDueDate: (date: string | null) => { text: string; isOverdue: boolean } | null
  orderingEnabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
    disabled: !orderingEnabled || todo.status === "done",
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const dueDateInfo = formatDueDate(todo.due_date)
  const isCompleted = todo.status === "done"

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid grid-cols-12 gap-4 p-4 hover:bg-muted/50 cursor-pointer transition-colors border-l-4 ${
        isCompleted ? "border-l-green-500/20 opacity-75" : "border-l-primary/20"
      }`}
    >
      <div className="col-span-1 flex items-center">
        {orderingEnabled && !isCompleted ? (
          <div {...attributes} {...listeners} className="cursor-grab hover:text-primary p-1 rounded">
            <GripVertical className="h-4 w-4" />
          </div>
        ) : (
          <div className="p-1">
            <GripVertical className="h-4 w-4 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="col-span-5" onClick={() => onTaskClick(todo)}>
        <div className={`font-medium text-foreground truncate ${isCompleted ? "line-through" : ""}`}>{todo.title}</div>
        {todo.description && <div className="text-sm text-muted-foreground truncate mt-1">{todo.description}</div>}
      </div>

      <div className="col-span-4 flex items-center" onClick={() => onTaskClick(todo)}>
        <Calendar className="h-3 w-3 mr-2 text-muted-foreground" />
        <span className="text-sm text-muted-foreground truncate">{todo.meetings?.title || "Personal Task"}</span>
      </div>

      <div className="col-span-2 flex items-center" onClick={() => onTaskClick(todo)}>
        {dueDateInfo && (
          <div
            className={`text-xs px-2 py-1 rounded flex items-center ${
              isCompleted
                ? "bg-green-100 text-green-700"
                : dueDateInfo.isOverdue
                  ? "bg-red-100 text-red-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            <Clock className="h-3 w-3 mr-1" />
            {dueDateInfo.text}
          </div>
        )}
      </div>
    </div>
  )
}

export default function MyTasksView({ user }: MyTasksViewProps) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Todo | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false)
  const [orderingEnabled, setOrderingEnabled] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  useEffect(() => {
    checkOrderingSupport()
    fetchTodos()
  }, [])

  const checkOrderingSupport = async () => {
    try {
      const { data, error } = await supabase.rpc("get_table_columns", { table_name: "todos" })

      if (!error && data) {
        const hasOrderIndex = data.some((col: any) => col.column_name === "order_index")
        setOrderingEnabled(hasOrderIndex)
      } else {
        const { error: testError } = await supabase.from("todos").select("order_index").limit(1)

        setOrderingEnabled(!testError)
      }
    } catch (error) {
      console.log("Order index column not available, drag and drop disabled")
      setOrderingEnabled(false)
    }
  }

  const fetchTodos = async () => {
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

      if (orderingEnabled) {
        query = query
          .order("order_index", { ascending: true, nullsFirst: false })
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false })
      } else {
        query = query
          .order("due_date", { ascending: true, nullsFirst: false })
          .order("created_at", { ascending: false })
      }

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

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!orderingEnabled) {
      console.log("Ordering disabled - order_index column not found")
      return
    }

    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = todos.findIndex((todo) => todo.id === active.id)
    const newIndex = todos.findIndex((todo) => todo.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const newTodos = arrayMove(todos, oldIndex, newIndex)
    setTodos(newTodos)

    try {
      const updates = newTodos
        .filter((todo) => todo.status === "pending")
        .map((todo, index) => ({
          id: todo.id,
          order_index: index,
        }))

      for (const update of updates) {
        await supabase.from("todos").update({ order_index: update.order_index }).eq("id", update.id)
      }

      console.log("[v0] Task order updated successfully")
    } catch (error) {
      console.error("Error updating task order:", error)
      fetchTodos()
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

  const handleTaskAdded = () => {
    fetchTodos()
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold font-work-sans text-foreground">My Tasks</h2>
            <p className="text-muted-foreground mt-2">All tasks assigned to you across all meetings</p>
          </div>
          <Button onClick={() => setShowAddTaskDialog(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Task
          </Button>
        </div>

        {!orderingEnabled && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
            <Info className="h-5 w-5 text-blue-600" />
            <div className="text-sm text-blue-800">
              <strong>Drag and drop ordering is currently disabled.</strong> Run the database migration script to enable
              task reordering functionality.
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading tasks...</div>
          </div>
        ) : todos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">Create your first task to get started.</p>
              <Button onClick={() => setShowAddTaskDialog(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingTodos.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold font-work-sans text-foreground mb-4">
                  Pending Tasks ({pendingTodos.length})
                </h3>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-hidden">
                      <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
                        <div className="col-span-1"></div>
                        <div className="col-span-5">Task</div>
                        <div className="col-span-4">Meeting</div>
                        <div className="col-span-2">Due Date</div>
                      </div>

                      {orderingEnabled ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={pendingTodos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                            <div className="divide-y">
                              {pendingTodos.map((todo) => (
                                <SortableTaskRow
                                  key={todo.id}
                                  todo={todo}
                                  onTaskClick={handleTaskClick}
                                  formatDueDate={formatDueDate}
                                  orderingEnabled={orderingEnabled}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      ) : (
                        <div className="divide-y">
                          {pendingTodos.map((todo) => (
                            <SortableTaskRow
                              key={todo.id}
                              todo={todo}
                              onTaskClick={handleTaskClick}
                              formatDueDate={formatDueDate}
                              orderingEnabled={orderingEnabled}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {completedTodos.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold font-work-sans text-foreground mb-4">
                  Completed Tasks ({completedTodos.length})
                </h3>
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-hidden">
                      <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b text-sm font-medium text-muted-foreground">
                        <div className="col-span-1"></div>
                        <div className="col-span-5">Task</div>
                        <div className="col-span-4">Meeting</div>
                        <div className="col-span-2">Due Date</div>
                      </div>

                      <div className="divide-y">
                        {completedTodos.map((todo) => (
                          <SortableTaskRow
                            key={todo.id}
                            todo={todo}
                            onTaskClick={handleTaskClick}
                            formatDueDate={formatDueDate}
                            orderingEnabled={false}
                          />
                        ))}
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

      <AddTaskDialog
        open={showAddTaskDialog}
        onOpenChange={setShowAddTaskDialog}
        onTaskAdded={handleTaskAdded}
        userId={user.id}
      />
    </div>
  )
}
