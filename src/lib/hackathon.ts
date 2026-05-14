import { createServerSupabaseClient } from "./supabase/server";
import { HACKATHON_SLUG, type Hackathon } from "@/types/db";

export async function getActiveHackathon(): Promise<Hackathon | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathons")
    .select("*")
    .eq("slug", HACKATHON_SLUG)
    .maybeSingle();
  return data as Hackathon | null;
}

export function isSubmissionWindowOpen(hackathon: Hackathon): boolean {
  return new Date(hackathon.submission_deadline_at).getTime() > Date.now();
}
