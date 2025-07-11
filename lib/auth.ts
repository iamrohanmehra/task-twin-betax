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
    .single();

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
  // Check if user is admin
  const { data: adminUser } = await supabase
    .from("app_users")
    .select("is_admin")
    .eq("email", email)
    .eq("is_admin", true)
    .single();

  if (adminUser) return true;

  // Check if user is a collaborator
  const { data: collaborator } = await supabase
    .from("collaborators")
    .select("user:app_users!inner(email)")
    .eq("user.email", email)
    .single();

  return !!collaborator;
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

// import { supabase } from "./supabase";
// import { AppUser, CollaboratorWithUser } from "./types";

// export const signInWithGoogle = async () => {
//   const { data, error } = await supabase.auth.signInWithOAuth({
//     provider: "google",
//     options: {
//       redirectTo: `${window.location.origin}/auth/callback`,
//     },
//   });

//   if (error) throw error;

//   // OAuth returns provider/url info, not user data immediately
//   return data;
// };

// export const signOut = async (): Promise<void> => {
//   const { error } = await supabase.auth.signOut();
//   if (error) throw error;
// };

// export const getCurrentUser = async () => {
//   const {
//     data: { user },
//     error,
//   } = await supabase.auth.getUser();

//   if (error) throw error;
//   return user;
// };

// export const getCurrentAppUser = async (): Promise<AppUser | null> => {
//   const user = await getCurrentUser();
//   if (!user?.email) return null;

//   const { data, error } = await supabase
//     .from("app_users")
//     .select("*")
//     .eq("email", user.email)
//     .maybeSingle(); // Use maybeSingle() instead of single() to handle no results gracefully

//   if (error) {
//     console.error("Error fetching app user:", error);
//     throw error; // Consider throwing instead of returning null for consistency
//   }

//   return data;
// };

// export const getCollaborators = async (): Promise<CollaboratorWithUser[]> => {
//   const { data, error } = await supabase
//     .from("collaborators")
//     .select(
//       `
//       *,
//       user:app_users(*)
//     `
//     )
//     .order("position");

//   if (error) {
//     console.error("Error fetching collaborators:", error);
//     throw error; // Throw instead of returning empty array for consistency
//   }

//   return data as CollaboratorWithUser[];
// };

// export const isUserAuthorized = async (email: string): Promise<boolean> => {
//   try {
//     // Check if user is admin
//     const { data: adminUser, error: adminError } = await supabase
//       .from("app_users")
//       .select("is_admin")
//       .eq("email", email)
//       .eq("is_admin", true)
//       .maybeSingle();

//     if (adminError) throw adminError;
//     if (adminUser) return true;

//     // Check if user is a collaborator
//     const { data: collaborator, error: collabError } = await supabase
//       .from("collaborators")
//       .select("user:app_users!inner(email)")
//       .eq("user.email", email)
//       .maybeSingle();

//     if (collabError) throw collabError;
//     return !!collaborator;
//   } catch (error) {
//     console.error("Error checking user authorization:", error);
//     return false; // Return false on error for security
//   }
// };

// export const createOrUpdateAppUser = async (
//   email: string,
//   name: string
// ): Promise<AppUser> => {
//   const { data, error } = await supabase
//     .from("app_users")
//     .upsert({ email, name }, { onConflict: "email" })
//     .select()
//     .single();

//   if (error) throw error;
//   return data;
// };
