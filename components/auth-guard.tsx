"use client";

import { useAuth } from "@/providers/auth-provider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const { user, appUser, loading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      console.log("AuthGuard checkAuth:", {
        loading,
        user: !!user,
        appUser: !!appUser,
        requireCollaborator,
      });

      if (loading) {
        console.log("Still loading, returning");
        return;
      }

      if (!user) {
        console.log("No user, setting authorized to false");
        setAuthorized(false);
        return;
      }

      if (requireAdmin && !appUser?.is_admin) {
        console.log("Admin required but user is not admin");
        setAuthorized(false);
        return;
      }

      if (requireCollaborator && user.email) {
        console.log("Checking collaborator authorization for:", user.email);
        const isAuth = await isUserAuthorized(user.email);
        console.log("Authorization result:", isAuth);
        setAuthorized(isAuth);
        return;
      }

      console.log("Setting authorized to true");
      setAuthorized(true);
    };

    checkAuth();
  }, [user, appUser, loading, requireAdmin, requireCollaborator]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error("Failed to sign in with Google");
      console.error("Sign in error:", error);
    }
  };

  if (loading || authorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>
              {!user ? "Sign In Required" : "Not Authorized"}
            </CardTitle>
            <CardDescription>
              {!user
                ? "Please sign in with your Google account to continue."
                : "You are not authorized to access this application."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user ? (
              <Button onClick={handleSignIn} className="w-full">
                Sign in with Google
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Contact your administrator for access.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
