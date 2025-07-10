"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/providers/auth-provider";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CollaboratorWithUser, AppUser } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      <AdminContent />
    </AuthGuard>
  );
}

function AdminContent() {
  const { signOut, appUser } = useAuth();
  const router = useRouter();
  const [collaborators, setCollaborators] = useState<CollaboratorWithUser[]>(
    []
  );
  const [user1, setUser1] = useState({ name: "", email: "" });
  const [user2, setUser2] = useState({ name: "", email: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCollaborators();
  }, []);

  const loadCollaborators = async () => {
    try {
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

      const collabData = data as CollaboratorWithUser[];

      // Pre-fill forms with existing data
      const position1 = collabData.find((c) => c.position === 1);
      const position2 = collabData.find((c) => c.position === 2);

      setUser1({
        name: position1?.user.name || "",
        email: position1?.user.email || "rohanmehra224466@gmail.com",
      });

      setUser2({
        name: position2?.user.name || "",
        email: position2?.user.email || "",
      });

      setCollaborators(collabData);
    } catch (error) {
      console.error("Error loading collaborators:", error);
      toast.error("Failed to load collaborators");
    }
  };

  const handleSaveCollaborators = async () => {
    if (!user1.email || !user2.email) {
      toast.error("Please fill in all fields");
      return;
    }

    if (user1.email === user2.email) {
      toast.error("User 1 and User 2 must have different emails");
      return;
    }

    setLoading(true);

    try {
      // Create or update app users
      const { data: appUser1, error: error1 } = await supabase
        .from("app_users")
        .upsert(
          { email: user1.email, name: user1.name },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (error1) throw error1;

      const { data: appUser2, error: error2 } = await supabase
        .from("app_users")
        .upsert(
          { email: user2.email, name: user2.name },
          { onConflict: "email" }
        )
        .select()
        .single();

      if (error2) throw error2;

      // Clear existing collaborators
      await supabase
        .from("collaborators")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // Insert new collaborators
      const { error: error3 } = await supabase.from("collaborators").insert([
        { user_id: appUser1.id, position: 1 },
        { user_id: appUser2.id, position: 2 },
      ]);

      if (error3) throw error3;

      toast.success("Collaborators updated successfully");
      loadCollaborators();
    } catch (error) {
      console.error("Error saving collaborators:", error);
      toast.error("Failed to save collaborators");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/admin-login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarFallback>
                {appUser?.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("") || "A"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <p className="text-gray-600">Manage collaborative todo users</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/")}>
              Go to Todo App
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Collaborator Management</CardTitle>
            <CardDescription>
              Configure the two users who can access the collaborative todo app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">User 1</h3>
                <div className="space-y-2">
                  <Label htmlFor="user1-name">Name</Label>
                  <Input
                    id="user1-name"
                    value={user1.name}
                    onChange={(e) =>
                      setUser1((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user1-email">Email</Label>
                  <Input
                    id="user1-email"
                    type="email"
                    value={user1.email}
                    onChange={(e) =>
                      setUser1((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Enter email"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">User 2</h3>
                <div className="space-y-2">
                  <Label htmlFor="user2-name">Name</Label>
                  <Input
                    id="user2-name"
                    value={user2.name}
                    onChange={(e) =>
                      setUser2((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user2-email">Email</Label>
                  <Input
                    id="user2-email"
                    type="email"
                    value={user2.email}
                    onChange={(e) =>
                      setUser2((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="Enter email"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button onClick={handleSaveCollaborators} disabled={loading}>
                {loading ? "Saving..." : "Save Collaborators"}
              </Button>
            </div>

            {collaborators.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Current Collaborators
                  </h3>
                  <div className="space-y-3">
                    {collaborators.map((collab) => (
                      <div
                        key={collab.id}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <Avatar>
                          <AvatarFallback>
                            {collab.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{collab.user.name}</p>
                          <p className="text-sm text-gray-600">
                            {collab.user.email}
                          </p>
                        </div>
                        <div className="text-sm text-gray-500">
                          Position {collab.position}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
