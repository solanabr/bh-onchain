export type User = {
  id: string;
  email: string;
  full_name: string | null;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  telegram_handle: string | null;
  avatar_url: string | null;
  luma_registered_at: string | null;
  age_attestation_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Hackathon = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  starts_at: string;
  submission_deadline_at: string;
  presential_at: string | null;
  luma_url: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
};

export type Team = {
  id: string;
  hackathon_id: string;
  name: string;
  description: string | null;
  leader_id: string;
  locked: boolean;
  created_at: string;
  updated_at: string;
};

export type TeamMember = {
  id: string;
  team_id: string;
  hackathon_id: string;
  user_id: string | null;
  invited_email: string;
  is_leader: boolean;
  status: "pending" | "accepted" | "removed";
  invite_token: string | null;
  invited_at: string;
  accepted_at: string | null;
};

export type Submission = {
  id: string;
  team_id: string;
  project_name: string | null;
  description: string | null;
  pitch_url: string | null;
  pitch_video_url: string | null;
  demo_video_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  image_path: string | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  last_edited_by: string | null;
  created_at: string;
  updated_at: string;
};

export const HACKATHON_SLUG = "bh-onchain-2026";
