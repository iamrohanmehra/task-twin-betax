"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/providers/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TaskWithUsers,
  CollaboratorWithUser,
  CreateTaskData,
} from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  task?: TaskWithUsers | null;
  collaborators: CollaboratorWithUser[];
}

export function TaskModal({
  open,
  onClose,
  onSave,
  task,
  collaborators,
}: TaskModalProps) {
  const { appUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    due_date: null as Date | null,
    due_time: "",
  });

  useEffect(() => {
    if (task) {
      // Editing existing task
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      setFormData({
        title: task.title,
        description: task.description || "",
        assigned_to: task.assigned_to,
        due_date: dueDate,
        due_time: dueDate ? dueDate.toTimeString().slice(0, 5) : "",
      });
    } else {
      // Creating new task - default to assigning to current user
      setFormData({
        title: "",
        description: "",
        assigned_to: appUser?.id || "",
        due_date: null,
        due_time: "",
      });
    }
  }, [task, appUser, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    if (!formData.assigned_to) {
      toast.error("Please select who to assign this task to");
      return;
    }

    setLoading(true);

    try {
      let due_date = null;
      if (formData.due_date) {
        const dateTime = formData.due_time
          ? `${formData.due_date.toISOString().split("T")[0]}T${
              formData.due_time
            }:00`
          : `${formData.due_date.toISOString().split("T")[0]}T23:59:59`;
        due_date = new Date(dateTime).toISOString();
      }

      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        assigned_to: formData.assigned_to,
        due_date,
      };

      if (task) {
        // Update existing task
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", task.id);

        if (error) throw error;
        toast.success("Task updated successfully");
      } else {
        // Create new task
        const { error } = await supabase.from("tasks").insert([
          {
            ...taskData,
            created_by: appUser?.id,
          },
        ]);

        if (error) throw error;
        toast.success("Task created successfully");
      }

      onSave();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error("Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create New Task"}</DialogTitle>
          <DialogDescription>
            {task
              ? "Update the task details below."
              : "Fill in the details for your new task."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter task description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned_to">Assign To *</Label>
            <Select
              value={formData.assigned_to}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, assigned_to: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                {collaborators.map((collab) => (
                  <SelectItem key={collab.user.id} value={collab.user.id}>
                    {collab.user.name} ({collab.user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <DatePicker
                date={formData.due_date}
                onDateChange={(date) =>
                  setFormData((prev) => ({ ...prev, due_date: date || null }))
                }
                placeholder="Select due date"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_time">Due Time</Label>
              <TimePicker
                time={formData.due_time}
                onTimeChange={(time) =>
                  setFormData((prev) => ({ ...prev, due_time: time }))
                }
                placeholder="Select due time"
                disabled={false}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : task ? "Update Task" : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
