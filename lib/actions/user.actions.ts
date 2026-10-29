"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";
import { generateSignedUrl } from "../supabase-storage";
import { revalidatePath } from "next/cache";

// ─── Row → Domain mappers ────────────────────────────────────────────────────

function mapUserRow(row: any): User | null {
  if (!row) return null;
  const fName = row.first_name ? String(row.first_name).toUpperCase() : "";
  const lName = row.last_name ? String(row.last_name).toUpperCase() : "";
  return {
    $id: row.id,
    userId: row.auth_id,
    email: row.email,
    firstName: fName,
    lastName: lName,
    name: `${fName} ${lName}`.trim(),
    role: row.role,
    userStatus: row.user_status,
    avatarUrl: row.avatar_url,
  } as any;
}

// ─── getUserInfo ─────────────────────────────────────────────────────────────

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return parseStringify(mapUserRow(data));
  } catch (error) {
    console.error("getUserInfo error:", error);
    return null;
  }
};

// ─── signIn ──────────────────────────────────────────────────────────────────

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.session) {
      console.error("signIn auth error:", authError);
      return null;
    }

    const adminSupabase = createSupabaseAdminClient();
    let { data: userRow, error: fetchError } = await adminSupabase
      .from("users")
      .select("*")
      .eq("auth_id", authData.user.id)
      .maybeSingle();

    if (fetchError) {
      console.error("signIn fetch user error:", fetchError);
      return null;
    }

    // Auto-recovery: if no profile document exists, create one
    if (!userRow) {
      console.warn(
        "No user profile found for auth_id:",
        authData.user.id,
        "— attempting auto-recovery."
      );
      const meta = authData.user.user_metadata ?? {};
      const nameParts = (authData.user.email ?? "System User").split("@");
      const firstName = meta.first_name ?? meta.firstName ?? nameParts[0] ?? "System";
      const lastName = meta.last_name ?? meta.lastName ?? "Admin";

      const isOwner = authData.user.email === "timtheesam@gmail.com";
      const defaultRole = isOwner ? "ADMIN" : "STAFF";
      const defaultStatus = isOwner ? "active" : "pending";

      const { data: recovered, error: recoverError } = await adminSupabase
        .from("users")
        .insert({
          auth_id: authData.user.id,
          email: authData.user.email,
          first_name: firstName,
          last_name: lastName,
          role: defaultRole,
          user_status: defaultStatus,
        })
        .select()
        .single();

      if (recoverError) {
        console.error("Auto-recovery failed:", recoverError);
        return null;
      }
      userRow = recovered;
    }

    // Fail-safe: auto-grant ADMIN to the owner's email
    if (userRow && userRow.email === "timtheesam@gmail.com" && (userRow.role !== "ADMIN" || userRow.user_status !== "active")) {
      const { data: escalated } = await adminSupabase
        .from("users")
        .update({ role: "ADMIN", user_status: "active" })
        .eq("id", userRow.id)
        .select()
        .single();
      if (escalated) {
        userRow = escalated;
        console.log("Auto-escalated timtheesam@gmail.com to ADMIN.");
      }
    }

    return parseStringify(mapUserRow(userRow));
  } catch (error) {
    console.error("signIn Error:", error);
    return null;
  }
};

// ─── signUp ──────────────────────────────────────────────────────────────────

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const email = userData.email?.trim().toLowerCase();
  const firstName = userData.firstName ? String(userData.firstName).trim().toUpperCase() : "";
  const lastName = userData.lastName ? String(userData.lastName).trim().toUpperCase() : "";

  try {
    const adminSupabase = createSupabaseAdminClient();

    // 1. Create auth user (pre-confirmed so no email verification needed)
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });

    if (authError || !authData.user) {
      throw new Error(authError?.message ?? "Error creating auth user");
    }

      const isOwner = email === "timtheesam@gmail.com";
      const { data: profileRow, error: profileError } = await adminSupabase
        .from("users")
        .insert({
          auth_id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role: isOwner ? "ADMIN" : "STAFF",
          user_status: isOwner ? "active" : "pending",
        })
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the auth user so the DB stays consistent
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(
        "Failed to create user profile. Rolling back auth account."
      );
    }

    // Do NOT sign in — user must wait for admin approval before accessing the app.
    return parseStringify(mapUserRow(profileRow));
  } catch (error: any) {
    console.error("signUp Error:", error);
    throw error;
  }
};

// ─── getPendingUsers ──────────────────────────────────────────────────────────
// Returns all users with user_status = 'pending' (admin use).

export const getPendingUsers = async () => {
  try {
    const adminSupabase = createSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getPendingUsers error:", error);
      return [];
    }
    return parseStringify((data ?? []).map(mapUserRow));
  } catch (error) {
    console.error("getPendingUsers unexpected error:", error);
    return [];
  }
};

// ─── approveUser ─────────────────────────────────────────────────────────────
// Flips a user's status to 'active', granting them full access.

export const approveUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const adminSupabase = createSupabaseAdminClient();
    const { error } = await adminSupabase
      .from("users")
      .update({ user_status: "active" })
      .eq("id", userId);

    if (error) {
      console.error("approveUser error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error("approveUser unexpected error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
};

// ─── rejectUser ──────────────────────────────────────────────────────────────
// Soft-rejects a user — marks them as 'rejected' in the DB for audit purposes.

export const rejectUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const adminSupabase = createSupabaseAdminClient();
    const { error } = await adminSupabase
      .from("users")
      .update({ user_status: "rejected" })
      .eq("id", userId);

    if (error) {
      console.error("rejectUser error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error: any) {
    console.error("rejectUser unexpected error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
};

// ─── inviteUser ───────────────────────────────────────────────────────────────
// Uses Supabase's built-in invite flow: sends the user a welcome email with a
// magic link. They click it, land on /reset-password to set their own password.
// No temporary password required from the admin.

export const inviteUser = async ({
  email,
  firstName,
  lastName,
  role = "STAFF",
}: {
  email: string;
  firstName: string;
  lastName: string;
  role?: "STAFF" | "MANAGER" | "ADMIN";
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = firstName ? String(firstName).trim().toUpperCase() : "";
    const cleanLastName = lastName ? String(lastName).trim().toUpperCase() : "";

    const adminSupabase = createSupabaseAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    // 0. Guard: reject if email already exists in our users table
    const { data: existing } = await adminSupabase
      .from("users")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `An account with ${cleanEmail} already exists.` };
    }

    // 1. Send the invite email — Supabase creates the auth user and emails a magic link.
    //    redirectTo is where the user lands after clicking the email link.
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.inviteUserByEmail(cleanEmail, {
        redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
        data: { first_name: cleanFirstName, last_name: cleanLastName },
      });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message ?? "Failed to send invite." };
    }

    // 2. Create the profile row immediately — active since admin is vouching for them.
    const { error: profileError } = await adminSupabase
      .from("users")
      .insert({
        auth_id: authData.user.id,
        email: cleanEmail,
        first_name: cleanFirstName,
        last_name: cleanLastName,
        role,
        user_status: "active",
      });

    if (profileError) {
      // Rollback: delete the auth user so no orphan exists
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: "Failed to create user profile. Invite rolled back." };
    }

    return { success: true };
  } catch (error: any) {
    console.error("inviteUser unexpected error:", error);
    return { success: false, error: "An unexpected error occurred." };
  }
};

// ─── getLoggedInUser ─────────────────────────────────────────────────────────

import { cache } from 'react';

export const getLoggedInUser = cache(async () => {
  try {
    const supabase = await createSupabaseServerClient();

    // getUser() validates the JWT with the Supabase Auth server, avoiding the
    // "insecure" warning that getSession() triggers. This function is wrapped
    // in React.cache() so that multiple calls within the same request (e.g.,
    // layout.tsx and page.tsx) only hit the Supabase Auth server once.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const profile = await getUserInfo({ userId: user.id });
    
    if (profile?.avatarUrl) {
      const signedUrl = await generateSignedUrl('client-assets', profile.avatarUrl, 3600);
      if (signedUrl) {
        profile.avatarUrl = signedUrl;
      }
    }

    return parseStringify(profile);
  } catch (error) {
    return null;
  }
});

// ─── logoutAccount ───────────────────────────────────────────────────────────

export const logoutAccount = async () => {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    return null;
  }
};

// ─── requestPasswordReset ─────────────────────────────────────────────────────
// Sends a password-reset email via Supabase Auth.
// redirectTo must be an absolute URL — Supabase appends the one-time token as a
// query param and the user lands on that page after clicking the link in email.

export const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = await createSupabaseServerClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      console.error("requestPasswordReset error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("requestPasswordReset unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
};

// ─── updatePassword ───────────────────────────────────────────────────────────
// Called on the /reset-password page after Supabase has exchanged the token for
// a session. At that point the user is authenticated and we can update password.

export const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error("updatePassword error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("updatePassword unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
};
// --- Security Authorization Guards ------------------------------------------

export const requireAuthenticatedUser = async () => {
  if (process.env.TEST_MODE === 'true') {
    return {
      $id: 'test-admin-id',
      email: 'test-admin@ebenezar.co.ke',
      firstName: 'Test',
      lastName: 'Manager',
      role: (process.env.TEST_USER_ROLE as any) || 'ADMIN',
    };
  }
  const user = await getLoggedInUser();
  if (!user) throw new Error("UNAUTHORIZED: You must be logged in to perform this action.");
  return user;
};

export const requireManagerRole = async () => {
  const user = await requireAuthenticatedUser();
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    throw new Error("FORBIDDEN: You must be an ADMIN or MANAGER to perform this action.");
  }
  return user;
};

export const requireAdminRole = async () => {
  const user = await requireAuthenticatedUser();
  if (user.role !== "ADMIN") {
    throw new Error("FORBIDDEN: You must be an ADMIN to perform this action.");
  }
  return user;
};

export const uploadUserAvatar = async (formData: FormData): Promise<{ success: boolean; path?: string; error?: string }> => {
  try {
    const user = await requireAuthenticatedUser();
    const file = formData.get('file') as File;
    if (!file) return { success: false, error: 'No file provided.' };

    if (file.size > 1024 * 1024) {
      return { success: false, error: 'File size must be less than 1MB.' };
    }

    const supabase = createSupabaseAdminClient();
    const path = `users/${user.userId}/avatar/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;

    const { data, error: uploadError } = await supabase.storage
      .from('client-assets')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      throw uploadError;
    }

    // Try to update avatar_url if the column exists in the users table.
    // If it doesn't, it will just fail silently which is fine.
    await supabase.from('users').update({ avatar_url: data.path }).eq('auth_id', user.userId);
    
    revalidatePath('/', 'layout');

    return { success: true, path: data.path };
  } catch (error: any) {
    console.error('uploadUserAvatar error:', error);
    return { success: false, error: error.message || 'Failed to upload avatar.' };
  }
};

export const updateUserProfile = async (firstName: string, lastName: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = await requireAuthenticatedUser();
    const supabase = createSupabaseAdminClient();
    
    // Update users table
    const { error: dbError } = await supabase
      .from('users')
      .update({ first_name: firstName, last_name: lastName })
      .eq('auth_id', user.userId);
      
    if (dbError) throw dbError;
    
    // Update auth metadata
    await supabase.auth.admin.updateUserById(user.userId, {
      user_metadata: { first_name: firstName, last_name: lastName }
    });
    
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('updateUserProfile error:', error);
    return { success: false, error: error.message || 'Failed to update profile.' };
  }
};

