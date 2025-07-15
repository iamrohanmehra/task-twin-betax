"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";

interface LoadingState {
  authLoading: boolean;
  authUser: boolean;
  authAppUser: boolean;
  timestamp: Date;
}

export function LoadingDebugger() {
  const { user, appUser, loading: authLoading } = useAuth();
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV === "development") {
      setIsVisible(true);
    }
  }, []);

  useEffect(() => {
    const newState: LoadingState = {
      authLoading,
      authUser: !!user,
      authAppUser: !!appUser,
      timestamp: new Date(),
    };

    setLoadingStates((prev) => [newState, ...prev.slice(0, 9)]);
  }, [authLoading, user, appUser]);

  const currentState = loadingStates[0];
  const isStuck =
    loadingStates.length > 3 &&
    loadingStates
      .slice(0, 3)
      .every(
        (state) =>
          state.authLoading === currentState?.authLoading &&
          state.authUser === currentState?.authUser &&
          state.authAppUser === currentState?.authAppUser
      );

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 bg-white border rounded-lg shadow-lg p-4 z-50 max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Loading Debugger</h3>
        <button
          onClick={() => setLoadingStates([])}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Auth Loading:</span>
          <span className={authLoading ? "text-red-600" : "text-green-600"}>
            {authLoading ? "YES" : "NO"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>User:</span>
          <span className={user ? "text-green-600" : "text-gray-600"}>
            {user ? "YES" : "NO"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>App User:</span>
          <span className={appUser ? "text-green-600" : "text-gray-600"}>
            {appUser ? "YES" : "NO"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Status:</span>
          <span
            className={isStuck ? "text-red-600 font-bold" : "text-green-600"}
          >
            {isStuck ? "STUCK!" : "OK"}
          </span>
        </div>
      </div>

      {loadingStates.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <div className="text-xs text-gray-500 mb-1">Recent States:</div>
          {loadingStates.slice(0, 3).map((state, i) => (
            <div key={i} className="text-xs flex justify-between">
              <span>
                {state.authLoading ? "L" : "-"}
                {state.authUser ? "U" : "-"}
                {state.authAppUser ? "A" : "-"}
              </span>
              <span>{state.timestamp.toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}

      {user && (
        <div className="mt-2 pt-2 border-t">
          <div className="text-xs text-gray-500 mb-1">User Info:</div>
          <div className="text-xs">
            <div>Email: {user.email}</div>
            <div>ID: {user.id}</div>
          </div>
        </div>
      )}
    </div>
  );
}
