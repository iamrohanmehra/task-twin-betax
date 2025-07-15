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
  const { user, appUser, loading } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const prevUserId = useRef<string | null>(null);
  const checkToken = useRef(0); // Token to track latest check
  const pathname = usePathname();

  // Reset auth state if user changes or route changes
  useEffect(() => {
    setAuthorized(null);
    setAuthLoading(true);
    prevUserId.current = user?.id ?? null;
    checkToken.current += 1; // Invalidate previous checks
  }, [user?.id, pathname]);

  useEffect(() => {
    if (loading || authorized !== null) return;

    let isActive = true;
    const myToken = checkToken.current;

    const checkAuth = async () => {
      if (!user) {
        if (isActive && myToken === checkToken.current) {
          setAuthorized(false);
          setAuthLoading(false);
        }
        return;
      }
      if (requireAdmin && !appUser?.is_admin) {
        if (isActive && myToken === checkToken.current) {
          setAuthorized(false);
          setAuthLoading(false);
        }
        return;
      }
      if (requireCollaborator && user.email) {
        try {
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Authorization check timeout")),
              8000
            )
          );
          const authPromise = isUserAuthorized(user.email);
          const isAuth = (await Promise.race([
            authPromise,
            timeoutPromise,
          ])) as boolean;
          if (isActive && myToken === checkToken.current) {
            setAuthorized(isAuth);
          }
        } catch (error) {
          if (isActive && myToken === checkToken.current) {
            setAuthorized(false);
          }
        } finally {
          if (isActive && myToken === checkToken.current) {
            setAuthLoading(false);
          }
        }
        return;
      }
      if (isActive && myToken === checkToken.current) {
        setAuthorized(true);
        setAuthLoading(false);
      }
    };

    checkAuth();
    return () => {
      isActive = false;
    };
  }, [
    user?.id,
    user?.email,
    appUser?.is_admin,
    loading,
    requireAdmin,
    requireCollaborator,
    authorized,
    pathname,
  ]);

  useEffect(() => {
    console.log("appUser", appUser);
  }, [appUser]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error("Failed to sign in with Google");
      console.error("Sign in error:", error);
    }
  };

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    if (!authLoading) return; // Don't set timeout if not loading
    const myToken = checkToken.current;
    const timeout = setTimeout(() => {
      if (myToken === checkToken.current) {
        console.warn("Auth loading timeout - forcing completion");
        setAuthLoading(false);
        setAuthorized(false);
      }
    }, 5000); // Reduced to 5 second timeout
    return () => clearTimeout(timeout);
  }, [authLoading]);

  if (loading || authLoading || authorized === null) {
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
