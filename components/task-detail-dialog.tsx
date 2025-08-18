"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, CheckSquare, Edit3, Trash2, X } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

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

interface TaskDetailDialogProps {
  task: Todo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated: () => void
  currentUserId: string
}

export default function TaskDetailDialog({
  task,
  open,
  onOpenChange,
  onTaskUpdated,
  currentUserId,
}: TaskDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    due_date: "",
  })

  const handleEdit = () => {
    if (task) {
      setEditData({
        title: task.title,
        description: task.description || "",
        due_date: task.due_date || "",
      })
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!task) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from("todos")
        .update({
          title: editData.title,
          description: editData.description,
          due_date: editData.due_date || null,
        })
        .eq("id", task.id)

      if (error) throw error

      setIsEditing(false)
      onTaskUpdated()
    } catch (error) {
      console.error("Error updating task:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!task) return

    setLoading(true)
    try {
      const { error } = await supabase.from("todos").update({ status: "done" }).eq("id", task.id)

      if (error) throw error

      onTaskUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Error completing task:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!task || !confirm("Are you sure you want to delete this task?")) return

    setLoading(true)
    try {
      const { error } = await supabase.from("todos").delete().eq("id", task.id)

      if (error) throw error

      onTaskUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error("Error deleting task:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return "No due date"
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (!task) return null

  const canEdit = task.created_by === currentUserId || task.assigned_to === currentUserId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Task Details</span>
            <div className="flex items-center gap-2">
              {canEdit && !isEditing && (
                <>
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleComplete} disabled={loading}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Complete
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDelete} disabled={loading}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
              {isEditing && (
                <>
                  <Button size="sm" onClick={handleSave} disabled={loading}>
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editData.title}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  placeholder="Task title"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="Task description"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Due Date</label>
                <Input
                  type="date"
                  value={editData.due_date}
                  onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{task.title}</h3>
              </div>

              {task.description && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Description</h4>
                  <p className="text-sm">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Meeting</div>
                    <div className="text-muted-foreground">{task.meetings?.title}</div>
                  </div>
                </div>

                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Due Date</div>
                    <div className="text-muted-foreground">{formatDate(task.due_date)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
