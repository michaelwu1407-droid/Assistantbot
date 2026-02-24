-- Create Supabase Storage bucket for job photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-photos',
  'job-photos',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies
-- Allow authenticated users to upload photos
CREATE POLICY "Users can upload job photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'job-photos' AND 
  auth.role() = 'authenticated'
);

-- Allow authenticated users to read photos
CREATE POLICY "Users can view job photos" ON storage.objects
FOR SELECT USING (
  bucket_id = 'job-photos' AND 
  auth.role() = 'authenticated'
);

-- Allow users to update their own photos
CREATE POLICY "Users can update own job photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'job-photos' AND 
  auth.role() = 'authenticated'
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own job photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'job-photos' AND 
  auth.role() = 'authenticated'
);

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
