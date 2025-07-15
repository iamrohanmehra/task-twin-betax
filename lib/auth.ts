import { supabase } from "./supabase";
import { AppUser, CollaboratorWithUser } from "./types";

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getCurrentAppUser = async (): Promise<AppUser | null> => {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("email", user.email)
    .maybeSingle(); // Use maybeSingle instead of single to handle missing users

  if (error) {
    console.error("Error fetching app user:", error);
    return null;
  }

  return data;
};

export const getCollaborators = async (): Promise<CollaboratorWithUser[]> => {
  const { data, error } = await supabase
    .from("collaborators")
    .select(
      `
      *,
      user:app_users(*)
    `
    )
    .order("position");

  if (error) {
    console.error("Error fetching collaborators:", error);
    return [];
  }

  return data as CollaboratorWithUser[];
};

export const isUserAuthorized = async (email: string): Promise<boolean> => {
  console.log("🔍 Checking authorization for:", email);
  const startTime = performance.now();

  try {
    // Single query to check both admin and collaborator status
    console.log("Checking user authorization...");
    const userStart = performance.now();
    const { data: user, error: userError } = await supabase
      .from("app_users")
      .select("id, is_admin")
      .eq("email", email)
      .maybeSingle();
    const userTime = performance.now() - userStart;
    console.log(`User query took: ${userTime.toFixed(0)}ms`);

    if (userError) {
      console.error("Error checking user:", userError);
      throw userError;
    }

    if (!user) {
      console.log("User not found in app_users");
      return false;
    }

    // Check if user is admin
    if (user.is_admin) {
      console.log("✅ User is admin");
      return true;
    }

    // Check if user is a collaborator - use a single query with join
    console.log("Checking collaborator status...");
    const collabStart = performance.now();
    const { data: collaborator, error: collabError } = await supabase
      .from("collaborators")
      .select("user_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const collabTime = performance.now() - collabStart;
    console.log(`Collaborator query took: ${collabTime.toFixed(0)}ms`);

    if (collabError) {
      console.error("Error checking collaborator status:", collabError);
      throw collabError;
    }

    const isAuthorized = !!collaborator;
    const totalTime = performance.now() - startTime;
    console.log(
      `Collaborator check result: ${isAuthorized}, Total time: ${totalTime.toFixed(
        0
      )}ms`
    );
    return isAuthorized;
  } catch (error) {
    console.error("Error checking user authorization:", error);
    throw error; // Re-throw to let the calling code handle it
  }
};

export const createOrUpdateAppUser = async (
  email: string,
  name: string
): Promise<AppUser> => {
  const { data, error } = await supabase
    .from("app_users")
    .upsert({ email, name }, { onConflict: "email" })
    .select()
    .single();

  if (error) throw error;
  return data;
};
