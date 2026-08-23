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

/** Accepte un email OU un nom d'utilisateur — Supabase Auth n'authentifie que par email, donc on résout le username avant signInWithPassword (voir get_email_for_login). */
export async function loginUser(identifier: string, password: string) {
  let email = identifier;
  if (!identifier.includes("@")) {
    const { data: resolved } = await supabase.rpc("get_email_for_login", { p_identifier: identifier });
    // Aucune correspondance : on laisse passer l'identifiant tel quel pour
    // que signInWithPassword échoue avec son message générique habituel,
    // plutôt que de révéler distinctement "ce nom d'utilisateur n'existe pas".
    if (resolved) email = resolved;
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

const STAFF_ROLES = ["ADMIN", "MODERATOR", "FINANCE_ADMIN", "TASK_MANAGER"];

export async function isStaffUser(userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).single();
  return !!data && STAFF_ROLES.includes(data.role);
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
