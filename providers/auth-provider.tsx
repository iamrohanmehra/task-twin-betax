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

  const fetchAppUser = async (user: User | null) => {
    if (!user) {
      setAppUser(null);
      return;
    }

    try {
      const appUserData = await getCurrentAppUser();
      setAppUser(appUserData);
    } catch (error) {
      console.error("Error fetching app user:", error);
      // Retry once after a short delay
      setTimeout(async () => {
        try {
          const appUserData = await getCurrentAppUser();
          setAppUser(appUserData);
        } catch (retryError) {
          console.error("Retry failed for app user:", retryError);
          setAppUser(null);
        }
      }, 1000);
    }
  };

  useEffect(() => {
    const getSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchAppUser(session.user);
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchAppUser(session.user);
      } else {
        setAppUser(null);
      }

      setLoading(false);
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
