import { supabase } from "@/services/supabase";

export interface RegisterInput {
  email: string;
  password: string;
  username: string;
  firstName: string;
  lastName: string;
  country: string;
  phoneCode: string;
  phone: string;
  referralCode?: string;
}

export async function registerUser(input: RegisterInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        username: input.username,
        first_name: input.firstName,
        last_name: input.lastName,
        country: input.country,
        phone_code: input.phoneCode,
        phone: input.phone,
        referral_code: input.referralCode ?? null,
      },
    },
  });
  if (error) {
    // GoTrue masque toujours la vraie cause d'une exception levée par le
    // trigger handle_new_user() derrière ce message générique — dans notre
    // trigger, le seul `raise exception` du chemin normal est un code de
    // parrainage introuvable, donc c'est quasi toujours l'explication réelle.
    if (error.message.toLowerCase().includes("database error saving new user")) {
      throw new Error("Code de parrainage invalide. Vérifiez le code saisi ou utilisez un lien d'invitation valide.");
    }
    throw error;
  }
  return data;
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

const STAFF_ROLES = ["ADMIN", "MODERATOR", "FINANCE_ADMIN", "TASK_MANAGER"];

export async function isStaffUser(userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return !!data && STAFF_ROLES.includes(data.role);
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
