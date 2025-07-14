"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { UserDashboard } from "@/components/todo-dashboard";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TaskModal } from "@/components/task-modal";
import { DeleteTaskDialog } from "@/components/delete-task-dialog";
import { useAuth } from "@/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { TaskWithUsers, CollaboratorWithUser } from "@/lib/types";

export default function HomePage() {
  const { signOut, appUser } = useAuth();
  const [tasks, setTasks] = useState<TaskWithUsers[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorWithUser[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithUsers | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskWithUsers | null>(null);
  const [selected, setSelected] = useState<"A" | "B">("A");

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadTasks(), loadCollaborators()]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(
        `
        *,
        creator:app_users!tasks_created_by_fkey(*),
        assignee:app_users!tasks_assigned_to_fkey(*)
      `
      )
      .order("created_at", { ascending: false });
    if (error) throw error;
    setTasks(data as TaskWithUsers[]);
  };

  const loadCollaborators = async () => {
    const { data, error } = await supabase
      .from("collaborators")
      .select(
        `
        *,
        user:app_users(*)
      `
      )
      .order("position");
    if (error) throw error;
    setCollaborators(data as CollaboratorWithUser[]);
  };

  const canEditTask = (task: TaskWithUsers): boolean => {
    if (!appUser) return false;
    return task.created_by === appUser.id;
  };

  const canCompleteTask = (task: TaskWithUsers): boolean => {
    if (!appUser) return false;
    return task.assigned_to === appUser.id;
  };

  const toggleTaskCompletion = async (task: TaskWithUsers) => {
    if (!canCompleteTask(task)) {
      toast.error("You can only complete tasks assigned to you");
      return;
    }
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ completed: !task.completed })
        .eq("id", task.id);
      if (error) throw error;
      toast.success(
        task.completed ? "Task marked as incomplete" : "Task completed!"
      );
      loadTasks();
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleEditTask = (task: TaskWithUsers) => {
    if (!canEditTask(task)) {
      toast.error("You can only edit tasks you created");
      return;
    }
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  const handleDeleteTask = (task: TaskWithUsers) => {
    if (!canEditTask(task)) {
      toast.error("You can only delete tasks you created");
      return;
    }
    setDeletingTask(task);
  };

  const handleTaskSaved = () => {
    setTaskModalOpen(false);
    setEditingTask(null);
    loadTasks();
  };

  const handleTaskDeleted = () => {
    setDeletingTask(null);
    loadTasks();
  };

  const getTasksForUser = (userId: string) => {
    return tasks.filter((task) => task.assigned_to === userId);
  };

  const user1 = collaborators.find((c) => c.position === 1)?.user;
  const user2 = collaborators.find((c) => c.position === 2)?.user;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <AuthGuard requireCollaborator>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 w-full max-w-6xl mx-auto rounded-xl shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Collaborative Todo</h1>
              <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-sm font-medium">
                {collaborators.length} Collaborators
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-700 font-bold">
                {appUser?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </div>
              <span className="font-medium">{appUser?.name}</span>
              {appUser?.is_admin && (
                <button
                  className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium transition"
                  onClick={() => (window.location.href = "/admin")}
                >
                  Admin Panel
                </button>
              )}
              <button
                className="px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium transition"
                onClick={signOut}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
        {/* Mobile/Tablet: Select Dropdown */}
        <div className="w-full max-w-md mx-auto block lg:hidden mb-4 sticky top-0 z-10 bg-gray-50/90 backdrop-blur-sm rounded-xl shadow-sm">
          <Select
            value={selected}
            onValueChange={(v) => setSelected(v as "A" | "B")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Dashboard" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">Dashboard A</SelectItem>
              <SelectItem value="B">Dashboard B</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Dashboards */}
        <div className="w-full flex-1 flex flex-col lg:flex-row items-stretch justify-center gap-6 max-w-6xl mx-auto transition-all duration-300">
          {/* Dashboard A */}
          <div
            className="w-full lg:w-1/2 transition-all duration-300"
            style={{
              display:
                selected === "A" ||
                (typeof window !== "undefined" && window.innerWidth >= 1024)
                  ? "block"
                  : "none",
            }}
          >
            <UserDashboard
              user={user1}
              tasks={user1 ? getTasksForUser(user1.id) : []}
              currentUser={appUser}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onToggleComplete={toggleTaskCompletion}
              onCreateTask={() => setTaskModalOpen(true)}
              canEditTask={canEditTask}
              canCompleteTask={canCompleteTask}
            />
          </div>
          {/* Dashboard B */}
          <div
            className="w-full lg:w-1/2 transition-all duration-300"
            style={{
              display:
                selected === "B" ||
                (typeof window !== "undefined" && window.innerWidth >= 1024)
                  ? "block"
                  : "none",
            }}
          >
            <UserDashboard
              user={user2}
              tasks={user2 ? getTasksForUser(user2.id) : []}
              currentUser={appUser}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onToggleComplete={toggleTaskCompletion}
              onCreateTask={() => setTaskModalOpen(true)}
              canEditTask={canEditTask}
              canCompleteTask={canCompleteTask}
            />
          </div>
        </div>
        {/* Modals */}
        <TaskModal
          open={taskModalOpen}
          onClose={() => {
            setTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSave={handleTaskSaved}
          task={editingTask}
          collaborators={collaborators}
        />
        <DeleteTaskDialog
          open={!!deletingTask}
          onClose={() => setDeletingTask(null)}
          onConfirm={handleTaskDeleted}
          task={deletingTask}
        />
      </div>
    </AuthGuard>
  );
}
