export interface HCP {
  id: string;
  name: string;
  specialty: string | null;
  hospital: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

export interface Interaction {
  id: string;
  hcp_id: string | null;
  visit_date: string;
  hospital: string | null;
  products_discussed: string[];
  samples_given: number;
  feedback: string | null;
  interest_level: 'high' | 'medium' | 'low' | 'neutral';
  follow_up_date: string | null;
  notes: string | null;
  ai_summary: string | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  next_action: string | null;
  created_via: string;
  raw_conversation: string | null;
  created_at: string;
  hcps?: HCP;
}

export interface ExtractedInteraction {
  hcp_name: string | null;
  hospital: string | null;
  visit_date: string | null;
  products_discussed: string[];
  samples_given: number;
  feedback: string | null;
  interest_level: 'high' | 'medium' | 'low' | 'neutral';
  follow_up_date: string | null;
  notes: string | null;
  ai_summary: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  next_action: string;
}

export type Page = 'dashboard' | 'hcps' | 'log-interaction' | 'interactions';

export interface EditTarget {
  id: string;
  source: 'edit-interaction';
}

export type NavigateFn = (page: Page, edit?: EditTarget) => void;
