# Society-Fix Resident Portal & Administrative Journal

A premium, high-aesthetic community management platform built on Next.js 14, Supabase, and Resend. Designed with a custom Concrete & Ink municipal ledger theme, it streamlines apartment maintenance tracking and critical announcements.

---

## Features

### Resident Workspace (`/dashboard` & `/notices`)
- **Portal Auth**: Secure signups collecting Full Name, Unit/Wing, and Phone metadata.
- **Defect Ledger**: File repair requests (Plumbing, Electrical, Cleaning, etc.) validated via React Hook Form + Zod.
- **Evidence Vault**: Secure image uploads to a dedicated Supabase Storage bucket.
- **Chronological Timeline**: View interactive pop-up cards tracing the status and note history of filed issues.
- **corkboard circulars**: A pinboard styled with hand-angled paper notes showing notices, prioritizing important updates at the top.

### Administrator Journal (`/admin` & `/admin/notices`)
- **Master Ledger**: View all complaints, wing numbers, category badges, and filing dates.
- **Active Sorting**: Open/Progress tickets older than 3 days are flagged `[OVERDUE]` and sorted to the top.
- **Analytics widget**: Live summary counters and a Recharts bar graph plotting complaint distributions.
- **Maintenance controls Sheet**: Alter priority tiers, log actions, and update statuses. Resolved tickets are permanently locked.
- **Official notice boards**: Publish new announcements and broadcast batch email digests to all residents.

---

## Tech Stack
- **Framework**: Next.js 14 (App Router, middleware-protected routes)
- **Database / Auth**: Supabase Database & Supabase SSR Auth
- **Email Service**: Resend SDK
- **Forms**: React Hook Form + Zod
- **Visuals**: Recharts, HSL Hues design system

---

## Getting Started

### 1. Database Setup (Supabase)
Create a new Supabase project and execute the following SQL in the SQL Editor to build the schemas, trigger functions, and security policies:

```sql
-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    apartment_no TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'resident',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow public read access to profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow individuals to update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create complaints table
CREATE TABLE public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    apartment_no TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on complaints
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

-- Complaints Policies
CREATE POLICY "Residents can view their own complaints" ON public.complaints FOR SELECT USING (auth.uid() = resident_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Residents can insert complaints" ON public.complaints FOR INSERT WITH CHECK (auth.uid() = resident_id);
CREATE POLICY "Admins can update complaints" ON public.complaints FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Create complaint_status_history table
CREATE TABLE public.complaint_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on complaint_status_history
ALTER TABLE public.complaint_status_history ENABLE ROW LEVEL SECURITY;

-- Policies for complaint_status_history
CREATE POLICY "Users can view status history of their complaints" ON public.complaint_status_history FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.complaints 
        WHERE id = complaint_id 
        AND (resident_id = auth.uid() OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
    )
);
CREATE POLICY "Admins can insert status history" ON public.complaint_status_history FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Create notices table
CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_important BOOLEAN NOT NULL DEFAULT false,
    author TEXT NOT NULL DEFAULT 'SUPERINTENDENT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on notices
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Notices Policies
CREATE POLICY "Allow public select on notices" ON public.notices FOR SELECT USING (true);
CREATE POLICY "Allow admin insert on notices" ON public.notices FOR INSERT WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
CREATE POLICY "Allow admin delete on notices" ON public.notices FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, apartment_no, phone, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'apartment_no', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'role', 'resident')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Storage Setup
Inside the Supabase Dashboard:
1. Go to **Storage**.
2. Click **New Bucket**.
3. Name the bucket `complaint-photos`.
4. Make the bucket **Public**.
5. Set up a Storage Policy allowing public read access to images, and authenticated users to upload folders.

### 3. Local Configuration
Create a `.env.local` file in the root directory (matching the structure of `.env.example`):
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### 4. Running Locally
Install dependencies:
```bash
pnpm install
```

Start the development server:
```bash
pnpm run dev
```

Build the production application bundle:
```bash
pnpm run build
```

---

## API & Route Index

### Routing Controls
- `/` - Landing Page / Portal Hub.
- `/login` - Concrete-Ink login screen.
- `/signup` - Resident metadata registration panel.
- `/dashboard` - Resident profile portal.
- `/notices` - Community notice pinboard.
- `/admin` - Superintendent workspace.
- `/admin/notices` - Bulletin board notice management.

### Backend Endpoints
- `POST /api/admin/update-status` - Changes priority/status, updates status history logs, fetches resident emails, and sends update alerts via Resend.
- `POST /api/admin/create-notice` - Records notices in DB and dispatches circular notification digests to all residents.
