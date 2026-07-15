/*
# AI-First CRM HCP Module – Initial Schema

## Overview
Creates the core tables for the Life Sciences CRM application used by Medical Representatives
to log and manage interactions with Healthcare Professionals (HCPs).

## New Tables

### hcps
Stores Healthcare Professional profiles (doctors, specialists, consultants).
- id: UUID primary key
- name: Full name of the HCP
- specialty: Medical specialty (Cardiologist, Oncologist, etc.)
- hospital: Primary hospital or clinic
- city: City of practice
- phone: Contact phone number
- email: Contact email address
- notes: Free-text notes about the HCP
- created_at: Record creation timestamp

### products
Pharmaceutical product catalog for reference during interaction logging.
- id: UUID primary key
- name: Product name
- category: Therapeutic category
- description: Product description

### interactions
Core interaction log records created by MRs after each HCP visit.
- id: UUID primary key
- hcp_id: Foreign key to hcps table
- visit_date: Date of the visit
- hospital: Hospital/clinic where visit occurred
- products_discussed: Array of product names discussed
- samples_given: Number of sample packs distributed
- feedback: Doctor's feedback text
- interest_level: Enum (high, medium, low, neutral)
- follow_up_date: Scheduled follow-up visit date
- notes: Additional meeting notes
- ai_summary: AI-generated meeting summary
- sentiment: AI-detected sentiment (positive, neutral, negative)
- next_action: AI-recommended next action
- created_via: How the record was created ('form' or 'ai')
- raw_conversation: Original AI conversation text
- created_at: Record creation timestamp

## Security
- RLS enabled on all tables.
- All policies use TO anon, authenticated (no sign-in required for this app).

## Seed Data
Inserts sample HCPs and products for demonstration purposes.
*/

-- HCPs table
CREATE TABLE IF NOT EXISTS hcps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  specialty text,
  hospital text,
  city text,
  phone text,
  email text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE hcps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_hcps" ON hcps;
CREATE POLICY "anon_select_hcps" ON hcps FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_hcps" ON hcps;
CREATE POLICY "anon_insert_hcps" ON hcps FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_hcps" ON hcps;
CREATE POLICY "anon_update_hcps" ON hcps FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_hcps" ON hcps;
CREATE POLICY "anon_delete_hcps" ON hcps FOR DELETE TO anon, authenticated USING (true);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE TO anon, authenticated USING (true);

-- Interactions table
CREATE TABLE IF NOT EXISTS interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hcp_id uuid REFERENCES hcps(id) ON DELETE SET NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  hospital text,
  products_discussed text[] DEFAULT '{}',
  samples_given integer DEFAULT 0,
  feedback text,
  interest_level text CHECK (interest_level IN ('high', 'medium', 'low', 'neutral')) DEFAULT 'neutral',
  follow_up_date date,
  notes text,
  ai_summary text,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')) DEFAULT 'neutral',
  next_action text,
  created_via text DEFAULT 'form',
  raw_conversation text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_interactions" ON interactions;
CREATE POLICY "anon_select_interactions" ON interactions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_interactions" ON interactions;
CREATE POLICY "anon_insert_interactions" ON interactions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_interactions" ON interactions;
CREATE POLICY "anon_update_interactions" ON interactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_interactions" ON interactions;
CREATE POLICY "anon_delete_interactions" ON interactions FOR DELETE TO anon, authenticated USING (true);

-- Seed HCPs
INSERT INTO hcps (name, specialty, hospital, city, phone, email) VALUES
  ('Dr. Ravi Kumar', 'Cardiologist', 'Apollo Hospital', 'Mumbai', '+91 98765 43210', 'ravi.kumar@apollo.com'),
  ('Dr. Priya Sharma', 'Oncologist', 'Fortis Healthcare', 'Delhi', '+91 98765 43211', 'priya.sharma@fortis.com'),
  ('Dr. Arjun Mehta', 'Diabetologist', 'Max Super Speciality', 'Bangalore', '+91 98765 43212', 'arjun.mehta@max.com'),
  ('Dr. Sunita Patel', 'Pulmonologist', 'Narayana Health', 'Chennai', '+91 98765 43213', 'sunita.patel@narayana.com'),
  ('Dr. Vikram Singh', 'Neurologist', 'Medanta Hospital', 'Hyderabad', '+91 98765 43214', 'vikram.singh@medanta.com'),
  ('Dr. Kavitha Nair', 'Rheumatologist', 'Kokilaben Hospital', 'Pune', '+91 98765 43215', 'kavitha.nair@kokilaben.com')
ON CONFLICT DO NOTHING;

-- Seed Products
INSERT INTO products (name, category, description) VALUES
  ('CardioPlus', 'Cardiology', 'Advanced cardiovascular protection tablet'),
  ('GlucoBalance', 'Diabetology', 'Dual-action blood glucose management'),
  ('OncoClear', 'Oncology', 'Targeted therapy for solid tumors'),
  ('NeuroCare', 'Neurology', 'Neuroprotective formulation for CNS disorders'),
  ('BreathEasy', 'Pulmonology', 'Long-acting bronchodilator for COPD/asthma'),
  ('ArthroRelief', 'Rheumatology', 'DMARD for rheumatoid arthritis management'),
  ('ImmunoShield', 'Immunology', 'Immunomodulator for autoimmune conditions')
ON CONFLICT DO NOTHING;

-- Seed sample interactions
INSERT INTO interactions (hcp_id, visit_date, hospital, products_discussed, samples_given, feedback, interest_level, follow_up_date, notes, ai_summary, sentiment, next_action, created_via)
SELECT 
  h.id,
  CURRENT_DATE - INTERVAL '3 days',
  'Apollo Hospital',
  ARRAY['CardioPlus', 'ImmunoShield'],
  5,
  'Doctor showed strong interest in the clinical trial data for CardioPlus. Requested detailed brochure.',
  'high',
  CURRENT_DATE + INTERVAL '7 days',
  'Follow up with clinical study references',
  'Dr. Ravi Kumar expressed high interest in CardioPlus during a 30-minute meeting at Apollo Hospital. Key discussion points included recent clinical trial outcomes and efficacy data. Doctor requested detailed product brochure and asked for case studies from peer cardiologists.',
  'positive',
  'Send clinical study PDF and schedule follow-up within 7 days',
  'ai'
FROM hcps h WHERE h.name = 'Dr. Ravi Kumar' LIMIT 1;

INSERT INTO interactions (hcp_id, visit_date, hospital, products_discussed, samples_given, feedback, interest_level, follow_up_date, notes, ai_summary, sentiment, next_action, created_via)
SELECT 
  h.id,
  CURRENT_DATE - INTERVAL '1 day',
  'Fortis Healthcare',
  ARRAY['OncoClear'],
  3,
  'Neutral response. Wants to see more patient outcome data before committing to prescriptions.',
  'medium',
  CURRENT_DATE + INTERVAL '14 days',
  'Bring Phase III trial summary on next visit',
  'Meeting with Dr. Priya Sharma at Fortis Healthcare focused on OncoClear targeted therapy. Doctor was cautious but open, requesting Phase III trial data and real-world patient outcomes before considering adoption.',
  'neutral',
  'Prepare Phase III trial summary and patient case studies for next visit',
  'form'
FROM hcps h WHERE h.name = 'Dr. Priya Sharma' LIMIT 1;
