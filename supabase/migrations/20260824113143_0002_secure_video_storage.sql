/*
# AfterCare — Private Video Storage

1. Purpose
   Creates a private storage bucket for patient activity videos. Video files
   are not publicly accessible; the app must request short-lived signed URLs.

2. Storage Rules
   - Bucket `aftercare-videos` is private.
   - Object paths must begin with the authenticated user's profile ID.
   - Patients can upload, read, and delete only their own files.
   - Doctors can read files belonging to their assigned patients.
   - Uploads are limited to common video MIME types and 100 MB.

3. Security
   Policies apply to `storage.objects` and enforce folder ownership or the
   doctor-to-patient assignment relationship in the database.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'aftercare-videos',
  'aftercare-videos',
  false,
  104857600,
  ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];

DROP POLICY IF EXISTS "patients_upload_own_videos" ON storage.objects;
CREATE POLICY "patients_upload_own_videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'aftercare-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "patients_read_own_videos" ON storage.objects;
CREATE POLICY "patients_read_own_videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'aftercare-videos'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.patients p
        WHERE p.doctor_id = auth.uid()
        AND (storage.foldername(name))[1] = p.profile_id::text
      )
    )
  );

DROP POLICY IF EXISTS "patients_delete_own_videos" ON storage.objects;
CREATE POLICY "patients_delete_own_videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'aftercare-videos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
