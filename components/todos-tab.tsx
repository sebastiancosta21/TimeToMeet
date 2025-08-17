"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, CheckSquare, Square, Calendar, Trash2, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { SupabaseUser } from "@supabase/supabase-js"

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

interface Participant {
  id: string
  email: string
  profiles?: {
    id: string
    email: string
    full_name: string
  }
}

interface TodosTabProps {
  meetingId: string
  todos: Todo[]
  participants: Participant[]
  currentUser: SupabaseUser
  onTodosUpdated: () => void
}

export default function TodosTab({ meetingId, todos, participants, currentUser, onTodosUpdated }: TodosTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    assigned_email: "",
    due_date: "",
  })

  const pendingTodos = todos.filter((todo) => todo.status === "pending")
  const completedTodos = todos.filter((todo) => todo.status === "done")

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assigned_to: "",
      assigned_email: "",
      due_date: "",
    })
    setEditingTodo(null)
  }

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const todoData = {
        meeting_id: meetingId,
        title: formData.title,
        description: formData.description,
        assigned_to: formData.assigned_to || null,
        assigned_email: formData.assigned_email || null,
        due_date: formData.due_date || null,
        created_by: currentUser.id,
        status: "pending",
      }

      if (editingTodo) {
        const { error } = await supabase.from("todos").update(todoData).eq("id", editingTodo.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("todos").insert(todoData)
        if (error) throw error
      }

      resetForm()
      setShowCreateDialog(false)
      onTodosUpdated()
    } catch (error) {
      console.error("Error saving todo:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTodo = async (todoId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "pending" ? "done" : "pending"
      const { error } = await supabase.from("todos").update({ status: newStatus }).eq("id", todoId)

      if (error) throw error
      onTodosUpdated()
    } catch (error) {
      console.error("Error updating todo:", error)
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", todoId)
      if (error) throw error
      onTodosUpdated()
    } catch (error) {
      console.error("Error deleting todo:", error)
    }
  }

  const handleEditTodo = (todo: Todo) => {
    setEditingTodo(todo)
    setFormData({
      title: todo.title,
      description: todo.description || "",
      assigned_to: todo.assigned_to || "",
      assigned_email: todo.assigned_email || "",
      due_date: todo.due_date || "",
    })
    setShowCreateDialog(true)
  }

  const handleAssigneeChange = (value: string) => {
    const participant = participants.find((p) => p.profiles?.id === value)
    setFormData((prev) => ({
      ...prev,
      assigned_to: value,
      assigned_email: participant?.profiles?.email || "",
    }))
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const canEditTodo = (todo: Todo) => {
    return todo.created_by === currentUser.id || todo.assigned_to === currentUser.id
  }

  return (
    <div className="space-y-6">
      {/* Create Todo Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold font-work-sans text-foreground">Tasks & To-Dos</h3>
          <p className="text-sm text-muted-foreground">
            {pendingTodos.length} pending, {completedTodos.length} completed
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-work-sans">{editingTodo ? "Edit Task" : "Create New Task"}</DialogTitle>
              <DialogDescription>
                {editingTodo ? "Update the task details" : "Add a new task for this meeting"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTodo}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Task Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Review quarterly reports"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional details about the task"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assigned_to">Assign To</Label>
                    <Select value={formData.assigned_to} onValueChange={handleAssigneeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {participants.map((participant) => (
                          <SelectItem key={participant.id} value={participant.profiles?.id || "unassigned"}>
                            {participant.profiles?.full_name || participant.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due_date">Due Date</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                  {loading ? "Saving..." : editingTodo ? "Update Task" : "Create Task"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-work-sans">
            <Square className="h-5 w-5 text-primary" />
            Pending Tasks
          </CardTitle>
          <CardDescription>{pendingTodos.length} tasks remaining</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingTodos.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No pending tasks</h3>
              <p className="text-muted-foreground">All tasks are completed or none have been created yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-6 w-6 mt-1"
                      onClick={() => handleToggleTodo(todo.id, todo.status)}
                    >
                      <Square className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{todo.title}</h4>
                      {todo.description && <p className="text-sm text-muted-foreground mt-1">{todo.description}</p>}
                      <div className="flex items-center gap-4 mt-2">
                        {todo.assigned_user && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(todo.assigned_user.full_name || "", todo.assigned_user.email)}
                              </AvatarFallback>
                            </Avatar>
                            {todo.assigned_user.full_name || todo.assigned_user.email}
                          </div>
                        )}
                        {todo.due_date && (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            <span className={isOverdue(todo.due_date) ? "text-destructive" : "text-muted-foreground"}>
                              {formatDate(todo.due_date)}
                            </span>
                            {isOverdue(todo.due_date) && <Badge variant="destructive">Overdue</Badge>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {canEditTodo(todo) && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEditTodo(todo)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      {completedTodos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-work-sans">
              <CheckSquare className="h-5 w-5 text-green-600" />
              Completed Tasks
            </CardTitle>
            <CardDescription>{completedTodos.length} tasks completed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg bg-muted/30"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 h-6 w-6 mt-1"
                      onClick={() => handleToggleTodo(todo.id, todo.status)}
                    >
                      <CheckSquare className="h-4 w-4 text-green-600" />
                    </Button>
                    <div className="flex-1">
                      <h4 className="font-medium text-muted-foreground line-through">{todo.title}</h4>
                      {todo.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-through">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        {todo.assigned_user && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(todo.assigned_user.full_name || "", todo.assigned_user.email)}
                              </AvatarFallback>
                            </Avatar>
                            {todo.assigned_user.full_name || todo.assigned_user.email}
                          </div>
                        )}
                        {todo.due_date && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDate(todo.due_date)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {canEditTodo(todo) && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
