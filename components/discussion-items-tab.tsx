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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, MessageSquare, Check, Edit, Trash2, GripVertical } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

interface DiscussionItem {
  id: string
  title: string
  description: string
  status: string
  order_index: number
  created_by: string
  created_at: string
  creator?: {
    id: string
    email: string
    full_name: string
  }
}

interface DiscussionItemsTabProps {
  meetingId: string
  discussionItems: DiscussionItem[]
  currentUser: User
  onDiscussionItemsUpdated: () => void
}

export default function DiscussionItemsTab({
  meetingId,
  discussionItems,
  currentUser,
  onDiscussionItemsUpdated,
}: DiscussionItemsTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<DiscussionItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  })

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
    })
    setEditingItem(null)
  }

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const itemData = {
        meeting_id: meetingId,
        title: formData.title,
        description: formData.description,
        created_by: currentUser.id,
        status: "pending",
        order_index: editingItem ? editingItem.order_index : discussionItems.length,
      }

      if (editingItem) {
        const { error } = await supabase.from("discussion_items").update(itemData).eq("id", editingItem.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("discussion_items").insert(itemData)
        if (error) throw error
      }

      resetForm()
      setShowCreateDialog(false)
      onDiscussionItemsUpdated()
    } catch (error) {
      console.error("Error saving discussion item:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsDone = async (itemId: string) => {
    try {
      const { error } = await supabase.from("discussion_items").update({ status: "done" }).eq("id", itemId)

      if (error) throw error
      onDiscussionItemsUpdated()
    } catch (error) {
      console.error("Error marking item as done:", error)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from("discussion_items").delete().eq("id", itemId)
      if (error) throw error
      onDiscussionItemsUpdated()
    } catch (error) {
      console.error("Error deleting discussion item:", error)
    }
  }

  const handleEditItem = (item: DiscussionItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description || "",
    })
    setShowCreateDialog(true)
  }

  const handleReorderItem = async (itemId: string, newIndex: number) => {
    try {
      const { error } = await supabase.from("discussion_items").update({ order_index: newIndex }).eq("id", itemId)

      if (error) throw error
      onDiscussionItemsUpdated()
    } catch (error) {
      console.error("Error reordering item:", error)
    }
  }

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/html", itemId)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (!draggedItem) return

    const draggedItemData = discussionItems.find((item) => item.id === draggedItem)
    if (!draggedItemData) return

    const currentIndex = discussionItems.findIndex((item) => item.id === draggedItem)
    if (currentIndex === dropIndex) return

    // Reorder items
    const newItems = [...discussionItems]
    const [removed] = newItems.splice(currentIndex, 1)
    newItems.splice(dropIndex, 0, removed)

    // Update order_index for all affected items
    try {
      const updates = newItems.map((item, index) => ({
        id: item.id,
        order_index: index,
      }))

      for (const update of updates) {
        const { error } = await supabase
          .from("discussion_items")
          .update({ order_index: update.order_index })
          .eq("id", update.id)

        if (error) throw error
      }

      onDiscussionItemsUpdated()
    } catch (error) {
      console.error("Error reordering items:", error)
    }

    setDraggedItem(null)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setDragOverIndex(null)
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
      hour: "numeric",
      minute: "2-digit",
    })
  }

  const canEditItem = (item: DiscussionItem) => {
    return item.created_by === currentUser.id
  }

  // Sort items by order_index
  const sortedItems = [...discussionItems].sort((a, b) => a.order_index - b.order_index)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold font-work-sans text-foreground">Discussion Items</h3>
          <p className="text-sm text-muted-foreground">
            {discussionItems.length} item{discussionItems.length !== 1 ? "s" : ""} to discuss
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-work-sans">
                {editingItem ? "Edit Discussion Item" : "Add Discussion Item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? "Update the discussion item details" : "Add a new topic to discuss in this meeting"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateItem}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Topic Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Budget review for Q2"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional context or questions to address"
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
                  {loading ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Discussion Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-work-sans">
            <MessageSquare className="h-5 w-5 text-primary" />
            Agenda Items
          </CardTitle>
          <CardDescription>
            Topics to discuss during the meeting. Items marked as done will be removed from the list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {discussionItems.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No discussion items</h3>
              <p className="text-muted-foreground mb-4">Add topics to discuss during this meeting</p>
              <Button onClick={() => setShowCreateDialog(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add First Item
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedItems.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-start gap-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors ${
                    draggedItem === item.id ? "opacity-50 bg-muted" : ""
                  } ${dragOverIndex === index ? "border-primary bg-primary/5" : ""}`}
                >
                  {/* Order indicator */}
                  <div className="flex items-center gap-2 mt-1">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing hover:text-primary" />
                    <Badge variant="outline" className="text-xs">
                      {index + 1}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{item.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(item.creator?.full_name || "", item.creator?.email || "")}
                              </AvatarFallback>
                            </Avatar>
                            <span>Added by {item.creator?.full_name || item.creator?.email}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsDone(item.id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        {canEditItem(item) && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-1">How Discussion Items Work</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Items are ordered by priority - drag to reorder</li>
                <li>• Mark items as done when discussed to remove them from the list</li>
                <li>• Only the creator can edit or delete their items</li>
                <li>• Use descriptions to add context or specific questions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
