-- Drop existing policies for meeting_participants
DROP POLICY IF EXISTS "Meeting creators can manage participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Meeting creators can insert participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Meeting creators can update participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Meeting creators can delete participants" ON public.meeting_participants;

-- Create a simple, direct policy that allows meeting creators to manage participants
CREATE POLICY "Allow meeting creators full access to participants" ON public.meeting_participants
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_participants.meeting_id 
      AND meetings.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_participants.meeting_id 
      AND meetings.created_by = auth.uid()
    )
  );

-- Also allow participants to read their own participation records
CREATE POLICY "Allow participants to read their own records" ON public.meeting_participants
  FOR SELECT
  USING (
    email = auth.email() OR
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE meetings.id = meeting_participants.meeting_id 
      AND meetings.created_by = auth.uid()
    )
  );
