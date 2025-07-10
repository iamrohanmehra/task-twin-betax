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
  console.log("getCurrentAppUser: Starting");
  const user = await getCurrentUser();
  console.log("getCurrentAppUser: Got user:", !!user?.email);
  if (!user?.email) return null;

  try {
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("email", user.email)
      .single();

    if (error) {
      console.error("Error fetching app user:", error);
      return null;
    }

    console.log("getCurrentAppUser: Got app user data:", !!data);
    return {
      ...data,
      is_admin: data.is_admin ?? false,
      created_at: data.created_at ?? new Date().toISOString(),
      updated_at: data.updated_at ?? new Date().toISOString(),
    };
  } catch (error) {
    console.error("getCurrentAppUser: Exception:", error);
    return null;
  }
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
  try {
    // Check if user is admin
    const { data: adminUser, error: adminError } = await supabase
      .from("app_users")
      .select("is_admin")
      .eq("email", email)
      .eq("is_admin", true)
      .single();

    if (adminUser) return true;

    // Check if user is a collaborator
    const { data: collaborator, error: collaboratorError } = await supabase
      .from("collaborators")
      .select("user:app_users!inner(email)")
      .eq("user.email", email)
      .single();

    return !!collaborator;
  } catch (error) {
    console.error("Error checking user authorization:", error);
    return false;
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
  return {
    ...data,
    is_admin: data.is_admin ?? false,
    created_at: data.created_at ?? new Date().toISOString(),
    updated_at: data.updated_at ?? new Date().toISOString(),
  };
};
