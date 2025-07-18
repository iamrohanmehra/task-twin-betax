"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CardNew,
  CardContentNew,
  CardHeaderNew,
  CardTitleNew,
} from "@/components/ui/cardNew";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { TaskWithUsers, CollaboratorWithUser } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { TaskModal } from "./task-modal";
import { DeleteTaskDialog } from "./delete-task-dialog";
import { Plus, Calendar, User, Edit3, Trash2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function TodoDashboard() {
  const { signOut, appUser } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskWithUsers[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorWithUser[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskWithUsers | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskWithUsers | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
    // Can edit if: created by current user
    return task.created_by === appUser.id;
  };

  const canCompleteTask = (task: TaskWithUsers): boolean => {
    if (!appUser) return false;
    // Can complete if: assigned to current user
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

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const getTasksForUser = (userId: string) => {
    return tasks.filter((task) => task.assigned_to === userId);
  };

  const user1 = collaborators.find((c) => c.position === 1);
  const user2 = collaborators.find((c) => c.position === 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">Collaborative Todo</h1>
            <Badge variant="secondary">
              {collaborators.length} Collaborators
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {appUser?.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("") || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{appUser?.name}</span>
            {appUser?.is_admin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin")}
              >
                Admin Panel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-73px)]">
        {/* User 1 Dashboard */}
        <div className="flex-1 p-6">
          <UserDashboard
            user={user1?.user}
            tasks={getTasksForUser(user1?.user.id || "")}
            currentUser={appUser}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={toggleTaskCompletion}
            onCreateTask={() => setTaskModalOpen(true)}
            canEditTask={canEditTask}
            canCompleteTask={canCompleteTask}
          />
        </div>

        {/* Separator */}
        <Separator orientation="vertical" className="h-full" />

        {/* User 2 Dashboard */}
        <div className="flex-1 p-6">
          <UserDashboard
            user={user2?.user}
            tasks={getTasksForUser(user2?.user.id || "")}
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
  );
}

export { UserDashboard };

interface UserDashboardProps {
  user: any;
  tasks: TaskWithUsers[];
  currentUser: any;
  onEditTask: (task: TaskWithUsers) => void;
  onDeleteTask: (task: TaskWithUsers) => void;
  onToggleComplete: (task: TaskWithUsers) => void;
  onCreateTask: () => void;
  canEditTask: (task: TaskWithUsers) => boolean;
  canCompleteTask: (task: TaskWithUsers) => boolean;
}

function UserDashboard({
  user,
  tasks,
  currentUser,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onCreateTask,
  canEditTask,
  canCompleteTask,
}: UserDashboardProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  if (!user) {
    return (
      <Card className="h-full">
        <CardContent className="flex items-center justify-center h-full">
          <p className="text-gray-500">No user configured</p>
        </CardContent>
      </Card>
    );
  }

  const completedTasks = tasks.filter((t) => t.completed);
  const pendingTasks = tasks.filter((t) => !t.completed);
  const currentTasks = showCompleted ? completedTasks : pendingTasks;
  const currentTaskCount = showCompleted
    ? completedTasks.length
    : pendingTasks.length;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
              <AvatarFallback className="text-sm sm:text-base">
                {user.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg sm:text-xl truncate">
                {user.name}
              </CardTitle>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {pendingTasks.length} pending
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {completedTasks.length} completed
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-4 sm:p-6 flex flex-col overflow-hidden">
        {currentUser?.id === user.id && (
          <Button onClick={onCreateTask} className="w-full flex-shrink-0 mb-4">
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        )}

        {/* Task Toggle */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setShowCompleted(false)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                !showCompleted
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Pending ({pendingTasks.length})
            </button>
            <button
              onClick={() => setShowCompleted(true)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                showCompleted
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Completed ({completedTasks.length})
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="flex-1 flex flex-col min-h-0 max-h-full">
          <h3 className="font-semibold text-gray-700 text-sm sm:text-base flex-shrink-0 mb-3">
            {showCompleted ? "Completed" : "Pending"} Tasks ({currentTaskCount})
          </h3>
          {currentTaskCount === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[200px]">
              <p className="text-gray-500 text-center text-sm">
                No {showCompleted ? "completed" : "pending"} tasks
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 scroll-container min-h-0 w-full max-h-full">
              {currentTasks.map((task) => (
                <div key={task.id} className="w-full">
                  <TaskCard
                    task={task}
                    currentUser={currentUser}
                    onEdit={() => onEditTask(task)}
                    onDelete={() => onDeleteTask(task)}
                    onToggleComplete={() => onToggleComplete(task)}
                    canEdit={canEditTask(task)}
                    canComplete={canCompleteTask(task)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskCardProps {
  task: TaskWithUsers;
  currentUser: any;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  canEdit: boolean;
  canComplete: boolean;
}

function TaskCard({
  task,
  currentUser,
  onEdit,
  onDelete,
  onToggleComplete,
  canEdit,
  canComplete,
}: TaskCardProps) {
  const isCreatedByMe = task.created_by === currentUser?.id;
  const isAssignedToMe = task.assigned_to === currentUser?.id;

  return (
    <CardNew
      className={`w-full ${
        task.completed ? "bg-green-50 border-green-200" : ""
      }`}
    >
      <CardContentNew className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 w-full">
          <div className="flex-1 min-w-0 max-w-full">
            <div className="flex items-start gap-2 mb-2">
              <h4
                className={`font-medium text-sm sm:text-base flex-1 ${
                  task.completed ? "line-through text-gray-500" : ""
                }`}
              >
                {task.title}
              </h4>
              {task.completed && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 text-xs flex-shrink-0"
                >
                  Completed
                </Badge>
              )}
            </div>

            {task.description && (
              <p
                className={`text-xs sm:text-sm text-gray-600 mb-2 ${
                  task.completed ? "line-through" : ""
                }`}
              >
                {task.description}
              </p>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>
                  by {isCreatedByMe ? "You" : task.creator?.name || "Unknown"}
                </span>
              </div>
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {canComplete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleComplete}
                className="h-8 w-8 p-0"
              >
                {task.completed ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </Button>
            )}

            {canEdit && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onEdit}
                  className="h-8 w-8 p-0"
                >
                  <Edit3 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContentNew>
    </CardNew>
  );
}
