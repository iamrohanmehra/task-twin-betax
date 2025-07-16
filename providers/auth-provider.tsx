"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { AppUser } from "@/lib/types";
import { getCurrentAppUser } from "@/lib/auth";
import { isUserAuthorized } from "@/lib/auth";

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  authorized: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>; // Add method to manually refresh auth
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_CACHE_KEY = "auth_status";
const AUTH_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

export function AuthProvider({
  children,
  initialUser = null,
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const initialLoad = useRef(true);

  // Helper to get cached auth data
  const getCachedAuthData = (userEmail: string) => {
    if (typeof window === "undefined") return null;

    try {
      const cacheRaw = localStorage.getItem(AUTH_CACHE_KEY);
      if (!cacheRaw) {
        console.log("No auth cache found for:", userEmail);
        return null;
      }

      const cache = JSON.parse(cacheRaw);
      if (
        cache.email === userEmail &&
        Date.now() - cache.timestamp < AUTH_CACHE_TTL
      ) {
        console.log(
          "Valid auth cache found for:",
          userEmail,
          "Age:",
          Math.round((Date.now() - cache.timestamp) / 1000),
          "seconds"
        );
        return cache;
      } else {
        console.log("Auth cache expired or invalid for:", userEmail);
      }
    } catch (error) {
      console.warn("Failed to parse auth cache:", error);
    }
    return null;
  };

  // Helper to set cached auth data
  const setCachedAuthData = (userEmail: string, data: any) => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(
        AUTH_CACHE_KEY,
        JSON.stringify({
          email: userEmail,
          ...data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.warn("Failed to set auth cache:", error);
    }
  };

  // Helper to fetch appUser and authorization in parallel, with timeout
  const lastCheckedEmail = useRef<string | null>(null);
  const fetchAuthState = async (
    user: User | null,
    skipCache = false,
    retryCount = 0
  ) => {
    if (!user) {
      setAppUser(null);
      setIsAdmin(false);
      setAuthorized(false);
      setLoading(false);
      // Only clear cache on explicit signout, not on initial load
      if (!initialLoad.current && typeof window !== "undefined") {
        localStorage.removeItem(AUTH_CACHE_KEY);
      }
      return;
    }

    // Prevent double invocation in dev for the same user/email
    const email = user.email ?? null;
    if (
      process.env.NODE_ENV === "development" &&
      lastCheckedEmail.current === email
    ) {
      console.log("[DEV] Skipping duplicate auth check for:", email);
      return;
    }
    lastCheckedEmail.current = email;

    setLoading(true);

    // Try cache first (unless explicitly skipping)
    if (!skipCache) {
      const cachedData = getCachedAuthData(user.email!);
      if (cachedData) {
        console.log("Using cached auth data for:", user.email);
        setAppUser(cachedData.appUser ?? null);
        setIsAdmin(!!cachedData.isAdmin);
        setAuthorized(!!cachedData.authorized);
        setLoading(false);
        return; // Exit early if we have valid cached data
      }
    }

    console.log(
      "Fetching fresh auth data for:",
      user.email,
      `(attempt ${retryCount + 1})`
    );

    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      console.warn("AuthProvider: auth check timeout - using fallback");
      // Don't set everything to null on timeout, just set loading to false
      setLoading(false);
    }, 15000); // Increased from 5s to 15s

    try {
      // Fetch appUser and authorization in parallel with individual timeouts
      const appUserPromise = getCurrentAppUser().catch((error) => {
        console.error("Error fetching app user:", error);
        return null;
      });

      const authPromise = isUserAuthorized(user.email!).catch((error) => {
        console.error("Error checking authorization:", error);
        return false;
      });

      const [appUserData, isAuth] = await Promise.all([
        appUserPromise,
        authPromise,
      ]);

      if (!didTimeout) {
        clearTimeout(timeout);

        const authData = {
          appUser: appUserData,
          isAdmin: !!appUserData?.is_admin,
          authorized: isAuth,
        };

        console.log("Auth data fetched successfully:", {
          appUser: !!appUserData,
          isAdmin: authData.isAdmin,
          authorized: isAuth,
        });

        setAppUser(appUserData);
        setIsAdmin(authData.isAdmin);
        setAuthorized(isAuth);
        setLoading(false);

        // Store in cache only if we got valid data
        if (appUserData || isAuth) {
          setCachedAuthData(user.email!, authData);
        }
      }
    } catch (error) {
      if (!didTimeout) {
        clearTimeout(timeout);
        console.error("AuthProvider: error in auth check", error);

        // Retry once if it's the first attempt
        if (retryCount === 0) {
          console.log("Retrying auth check...");
          setTimeout(() => fetchAuthState(user, skipCache, 1), 1000);
          return;
        }

        // On error, try to use cached data as fallback
        const cachedData = getCachedAuthData(user.email!);
        if (cachedData) {
          console.log("Using cached data as fallback due to error");
          setAppUser(cachedData.appUser ?? null);
          setIsAdmin(!!cachedData.isAdmin);
          setAuthorized(!!cachedData.authorized);
        } else {
          // No cache available, set defaults
          setAppUser(null);
          setIsAdmin(false);
          setAuthorized(false);
        }
        setLoading(false);
      }
    }
  };

  // Manual refresh method
  const refreshAuth = async () => {
    if (user) {
      await fetchAuthState(user, true, 0); // Skip cache to force refresh
    }
  };

  useEffect(() => {
    // If initialUser is provided, hydrate immediately
    if (initialUser !== null) {
      setUser(initialUser);
      fetchAuthState(initialUser).finally(() => {
        setHydrated(true);
        initialLoad.current = false;
      });
    } else {
      const getSession = async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          setUser(session?.user ?? null);
          await fetchAuthState(session?.user ?? null);
        } catch (error) {
          setUser(null);
          setAppUser(null);
          setIsAdmin(false);
          setAuthorized(false);
          setLoading(false);
          console.error("AuthProvider: error getting session", error);
        } finally {
          setHydrated(true);
          initialLoad.current = false;
        }
      };
      getSession();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      await fetchAuthState(session?.user ?? null, true); // skip cache on auth change
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_CACHE_KEY);
    }
    await supabase.auth.signOut();
  };

  // Show spinner until hydrated
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        authorized,
        isAdmin,
        signOut: handleSignOut,
        refreshAuth,
      }}
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
