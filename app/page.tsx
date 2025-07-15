"use client";

import { useEffect, useState, useRef } from "react";
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
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    console.log("appUser", appUser);
  }, [appUser]);

  useEffect(() => {
    console.log("loading", loading);
  }, [loading]);

  useEffect(() => {
    // Only load data if user is authenticated and authorized, and data hasn't been loaded yet
    if (appUser && loading && !dataLoadedRef.current) {
      console.log("User authenticated, loading data...", appUser);
      dataLoadedRef.current = true;
      loadData();
    }

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("Loading timeout reached, forcing loading to false");
        setLoading(false);
      }
    }, 10000); // 10 seconds for debugging

    return () => {
      clearTimeout(timeout);
      dataLoadedRef.current = false;
    };
    // eslint-disable-next-line
  }, [appUser, loading]); // Add loading as dependency to prevent duplicate calls

  const loadData = async (retryCount = 0) => {
    const startTime = performance.now();
    let queryCount = 0;

    setLoading(true);
    try {
      // Load collaborators first, then tasks to avoid overwhelming the database
      await loadCollaborators();
      queryCount++;
      await loadTasks();
      queryCount++;

      const loadTime = performance.now() - startTime;
      console.log(
        `Data loaded in ${loadTime.toFixed(0)}ms with ${queryCount} queries`
      );
    } catch (error) {
      console.error("Error loading data:", error);

      // Retry once if it's the first attempt
      if (retryCount === 0) {
        console.log("Retrying data load...");
        setTimeout(() => loadData(1), 1000); // Reduced from 2000ms to 1000ms
        return;
      }

      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      // Simplified query - load tasks first, then fetch user details separately if needed
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // If we have tasks, fetch user details in a single query
      if (data && data.length > 0) {
        const userIds = [
          ...new Set([
            ...data
              .map((task) => task.created_by)
              .filter((id): id is string => id !== null),
            ...data
              .map((task) => task.assigned_to)
              .filter((id): id is string => id !== null),
          ]),
        ];

        if (userIds.length > 0) {
          const { data: users, error: usersError } = await supabase
            .from("app_users")
            .select("*")
            .in("id", userIds);

          if (usersError) throw usersError;

          // Merge user data with tasks
          const usersMap = new Map(users?.map((user) => [user.id, user]) || []);
          const tasksWithUsers = data.map((task) => ({
            ...task,
            creator: usersMap.get(task.created_by || ""),
            assignee: usersMap.get(task.assigned_to || ""),
          }));

          setTasks(tasksWithUsers as TaskWithUsers[]);
        } else {
          setTasks(data as TaskWithUsers[]);
        }
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
      throw error;
    }
  };

  const loadCollaborators = async () => {
    try {
      const { data, error } = await supabase
        .from("collaborators")
        .select("*, user:app_users(*)")
        .order("position");
      if (error) throw error;
      setCollaborators(data as CollaboratorWithUser[]);
    } catch (error) {
      console.error("Error loading collaborators:", error);
      throw error;
    }
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
      // Update local state instead of reloading all tasks
      setTasks((prevTasks) =>
        prevTasks.map((t) =>
          t.id === task.id ? { ...t, completed: !t.completed } : t
        )
      );
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
    // Reload tasks to get the latest data
    loadTasks();
  };

  const handleTaskDeleted = () => {
    setDeletingTask(null);
    // Remove task from local state instead of reloading all tasks
    if (deletingTask) {
      setTasks((prevTasks) =>
        prevTasks.filter((t) => t.id !== deletingTask.id)
      );
    }
  };

  const getTasksForUser = (userId: string) => {
    return tasks.filter((task) => task.assigned_to === userId);
  };

  const user1 = collaborators.find((c) => c.position === 1)?.user;
  const user2 = collaborators.find((c) => c.position === 2)?.user;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
          {appUser && (
            <p className="text-sm text-gray-500 mt-2">User: {appUser.email}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requireCollaborator>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-4 sm:px-6 py-4 w-full shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <h1 className="text-xl sm:text-2xl font-bold">
                Collaborative Todo
              </h1>
              <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs sm:text-sm font-medium">
                {collaborators.length} Collaborators
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 text-gray-700 font-bold text-sm sm:text-base">
                {appUser?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </div>
              <span className="font-medium text-sm sm:text-base truncate">
                {appUser?.name}
              </span>
              <div className="flex gap-2 ml-auto sm:ml-0">
                {appUser?.is_admin && (
                  <button
                    className="px-2 sm:px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-xs sm:text-sm font-medium transition"
                    onClick={() => (window.location.href = "/admin")}
                  >
                    Admin
                  </button>
                )}
                <button
                  className="px-2 sm:px-3 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 text-xs sm:text-sm font-medium transition"
                  onClick={signOut}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Dashboard Switch */}
        <div className="lg:hidden bg-white border-b px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Dashboard</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelected("A")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  selected === "A"
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {user1?.name || "User A"}
              </button>
              <button
                onClick={() => setSelected("B")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                  selected === "B"
                    ? "bg-primary text-primary-foreground"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {user2?.name || "User B"}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          <div className="max-w-6xl mx-auto">
            {/* Desktop Layout */}
            <div className="hidden lg:flex gap-6">
              {/* Dashboard A */}
              <div className="flex-1">
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
              <div className="flex-1">
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

            {/* Mobile Layout */}
            <div className="lg:hidden">
              {selected === "A" && (
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
              )}
              {selected === "B" && (
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
              )}
            </div>
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
