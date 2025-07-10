"use client";

import { AuthGuard } from "@/components/auth-guard";
import { TodoDashboard } from "../components/todo-dashboard"; // TODO: fix this

export default function HomePage() {
  return (
    <AuthGuard requireCollaborator>
      <TodoDashboard />
    </AuthGuard>
  );
}
