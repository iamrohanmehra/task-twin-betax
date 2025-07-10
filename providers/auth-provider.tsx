"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/auth-helpers-nextjs";
import { supabase } from "@/lib/supabase";
import { AppUser } from "@/lib/types";
import { getCurrentAppUser } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log("AuthProvider: Timeout reached, forcing loading to false");
      setLoading(false);
    }, 5000); // 5 second timeout

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const getSession = async () => {
      try {
        console.log("AuthProvider: Getting session - starting");
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("AuthProvider: Session result:", !!session?.user);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log(
            "AuthProvider: Getting app user for:",
            session.user.email
          );
          const appUserData = await getCurrentAppUser();
          console.log("AuthProvider: App user result:", !!appUserData);
          setAppUser(appUserData);
        } else {
          console.log("AuthProvider: No session user, setting appUser to null");
          setAppUser(null);
        }

        console.log("AuthProvider: Setting loading to false");
        setLoading(false);
      } catch (error) {
        console.error("AuthProvider: Error in getSession:", error);
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        console.log("AuthProvider: Auth state change:", event, !!session?.user);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log(
            "AuthProvider: Getting app user for auth change:",
            session.user.email
          );
          const appUserData = await getCurrentAppUser();
          console.log(
            "AuthProvider: App user result from auth change:",
            !!appUserData
          );
          setAppUser(appUserData);
        } else {
          setAppUser(null);
        }

        console.log("AuthProvider: Setting loading to false from auth change");
        setLoading(false);
      } catch (error) {
        console.error("AuthProvider: Error in auth state change:", error);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, appUser, loading, signOut: handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
