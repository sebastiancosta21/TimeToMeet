-- Fix RLS policies for meeting_participants table
-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Meeting creators can manage participants" ON public.meeting_participants;

-- Create separate policies for different operations
CREATE POLICY "Meeting creators can insert participants" ON public.meeting_participants
  FOR INSERT WITH CHECK (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Meeting creators can update participants" ON public.meeting_participants
  FOR UPDATE USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Meeting creators can delete participants" ON public.meeting_participants
  FOR DELETE USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

-- Also allow participants to update their own status
CREATE POLICY "Participants can update their own status" ON public.meeting_participants
  FOR UPDATE USING (user_id = auth.uid());
