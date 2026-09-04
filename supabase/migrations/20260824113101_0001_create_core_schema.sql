/*
# AfterCare — Core Schema

1. Purpose
   AfterCare is an AI-based post-discharge patient follow-up system. Patients
   chat with an AI assistant, upload activity videos, and receive doctor
   feedback. Doctors review AI-generated summaries, original conversations,
   and videos before sending feedback.

2. New Tables
   - `profiles` — extends auth.users with full_name, role (patient/doctor), avatar, specialty.
   - `patients` — patient medical context: assigned doctor, diagnosis, discharge date, activity plan.
   - `conversations` — an AI chatbot conversation session for a patient.
   - `messages` — individual messages within a conversation (role: patient | assistant).
   - `ai_summaries` — structured AI-generated summary linked to a conversation.
   - `videos` — uploaded activity videos with review status and links to conversation/summary.
   - `feedback` — doctor feedback on a specific video.
   - `notifications` — notifications directed at a specific user (patient or doctor).

3. Security
   - RLS enabled on every table.
   - Patients can only access their own data.
   - Doctors can only access data for patients assigned to them.
   - Notifications are owner-scoped (only the recipient can read/mark-read).
   - A SECURITY DEFINER trigger auto-creates a profile row when a new auth user signs up.

4. Important Notes
   - `profiles.id` is a foreign key to `auth.users(id)` with ON DELETE CASCADE.
   - `patients.profile_id` and `patients.doctor_id` both reference `profiles(id)`.
   - All patient-owned tables use `patient_id` referencing `profiles(id)`.
   - Doctor access is granted via an EXISTS subquery checking `patients.doctor_id = auth.uid()`.
*/

-- ── profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL DEFAULT 'New User',
  role        text NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor')),
  avatar_url  text,
  specialty   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── patients ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patients (
  profile_id     uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  doctor_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth  date,
  diagnosis      text NOT NULL DEFAULT 'Not specified',
  discharge_date date,
  activity_plan  text NOT NULL DEFAULT 'General mobility and light exercises as tolerated.',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── conversations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'summarized')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── messages ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('patient', 'assistant')),
  content         text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── ai_summaries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_summaries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  patient_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_status text NOT NULL DEFAULT 'Not reported',
  difficulty       text NOT NULL DEFAULT 'Not reported',
  main_concern     text NOT NULL DEFAULT 'Not reported',
  patient_question text NOT NULL DEFAULT 'Not reported',
  summary          text NOT NULL DEFAULT 'No summary available.',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── videos ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.videos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_name    text NOT NULL,
  activity_date    date NOT NULL DEFAULT CURRENT_DATE,
  message_to_doctor text,
  storage_path     text NOT NULL,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'reviewed')),
  conversation_id  uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  summary_id       uuid REFERENCES public.ai_summaries(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── feedback ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id    uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  doctor_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('doctor_review_request', 'patient_feedback', 'video_reviewed', 'new_message')),
  title       text NOT NULL,
  message     text NOT NULL,
  video_id    uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Enable RLS on all tables ───────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ── Profiles policies ──────────────────────────────────────
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.doctor_id = auth.uid() AND p.profile_id = id
    )
  );

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Patients policies ─────────────────────────────────────
DROP POLICY IF EXISTS "select_patients" ON public.patients;
CREATE POLICY "select_patients" ON public.patients
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id OR auth.uid() = doctor_id);

DROP POLICY IF EXISTS "update_patients" ON public.patients;
CREATE POLICY "update_patients" ON public.patients
  FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id)
  WITH CHECK (auth.uid() = doctor_id);

-- ── Conversations policies ─────────────────────────────────
DROP POLICY IF EXISTS "select_conversations" ON public.conversations;
CREATE POLICY "select_conversations" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.profile_id = conversations.patient_id AND p.doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_conversations" ON public.conversations;
CREATE POLICY "insert_conversations" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "update_conversations" ON public.conversations;
CREATE POLICY "update_conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = patient_id)
  WITH CHECK (auth.uid() = patient_id);

-- ── Messages policies ──────────────────────────────────────
DROP POLICY IF EXISTS "select_messages" ON public.messages;
CREATE POLICY "select_messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
      AND (
        c.patient_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.patients p
          WHERE p.profile_id = c.patient_id AND p.doctor_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "insert_messages" ON public.messages;
CREATE POLICY "insert_messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id AND c.patient_id = auth.uid()
    )
  );

-- ── AI Summaries policies ──────────────────────────────────
DROP POLICY IF EXISTS "select_summaries" ON public.ai_summaries;
CREATE POLICY "select_summaries" ON public.ai_summaries
  FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.profile_id = ai_summaries.patient_id AND p.doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_summaries" ON public.ai_summaries;
CREATE POLICY "insert_summaries" ON public.ai_summaries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id);

-- ── Videos policies ───────────────────────────────────────
DROP POLICY IF EXISTS "select_videos" ON public.videos;
CREATE POLICY "select_videos" ON public.videos
  FOR SELECT TO authenticated
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.profile_id = videos.patient_id AND p.doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_videos" ON public.videos;
CREATE POLICY "insert_videos" ON public.videos
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = patient_id);

DROP POLICY IF EXISTS "update_videos" ON public.videos;
CREATE POLICY "update_videos" ON public.videos
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.profile_id = videos.patient_id AND p.doctor_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = patient_id
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.profile_id = videos.patient_id AND p.doctor_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_videos" ON public.videos;
CREATE POLICY "delete_videos" ON public.videos
  FOR DELETE TO authenticated
  USING (auth.uid() = patient_id);

-- ── Feedback policies ──────────────────────────────────────
DROP POLICY IF EXISTS "select_feedback" ON public.feedback;
CREATE POLICY "select_feedback" ON public.feedback
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = feedback.video_id
      AND (
        v.patient_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.patients p
          WHERE p.profile_id = v.patient_id AND p.doctor_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "insert_feedback" ON public.feedback;
CREATE POLICY "insert_feedback" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = doctor_id
    AND EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = feedback.video_id
      AND EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.profile_id = v.patient_id AND p.doctor_id = auth.uid()
      )
    )
  );

-- ── Notifications policies ─────────────────────────────────
DROP POLICY IF EXISTS "select_notifications" ON public.notifications;
CREATE POLICY "select_notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_notifications" ON public.notifications;
CREATE POLICY "update_notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications" ON public.notifications;
CREATE POLICY "insert_notifications" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.profile_id = auth.uid() AND p.doctor_id = notifications.user_id
    )
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.doctor_id = auth.uid() AND p.profile_id = notifications.user_id
    )
  );

-- ── Indexes ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON public.patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_conversations_patient_id ON public.conversations(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_summaries_patient_id ON public.ai_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_videos_patient_id ON public.videos(patient_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON public.videos(status);
CREATE INDEX IF NOT EXISTS idx_feedback_video_id ON public.feedback(video_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);

-- ── Auto-create profile on signup ──────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, specialty)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    NEW.raw_user_meta_data->>'specialty'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
