"use client";

import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isUserAuthorized } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithGoogle } from "@/lib/auth";
import { toast } from "sonner";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireCollaborator?: boolean;
}

export function AuthGuard({
  children,
  requireAdmin = false,
  requireCollaborator = false,
}: AuthGuardProps) {
  const { user, appUser, loading, authorized, isAdmin } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error("Failed to sign in with Google");
      console.error("Sign in error:", error);
    }
  };

  // Show spinner while loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Not signed in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in with your Google account to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignIn} className="w-full">
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authorized (admin/collaborator check)
  if ((requireAdmin && !isAdmin) || (requireCollaborator && !authorized)) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Authorized</CardTitle>
            <CardDescription>
              You are not authorized to access this application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Contact your administrator for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authorized
  return <>{children}</>;
}
