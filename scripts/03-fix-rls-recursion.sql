-- Drop all existing policies that cause circular references
DROP POLICY IF EXISTS "Users can view meetings they're involved in" ON public.meetings;
DROP POLICY IF EXISTS "Users can create meetings" ON public.meetings;
DROP POLICY IF EXISTS "Meeting creators can update their meetings" ON public.meetings;
DROP POLICY IF EXISTS "Meeting creators can delete their meetings" ON public.meetings;

DROP POLICY IF EXISTS "Users can view participants of their meetings" ON public.meeting_participants;
DROP POLICY IF EXISTS "Meeting creators can manage participants" ON public.meeting_participants;

DROP POLICY IF EXISTS "Users can view todos from their meetings" ON public.todos;
DROP POLICY IF EXISTS "Meeting participants can create todos" ON public.todos;
DROP POLICY IF EXISTS "Todo creators and assignees can update todos" ON public.todos;

DROP POLICY IF EXISTS "Users can view discussion items from their meetings" ON public.discussion_items;
DROP POLICY IF EXISTS "Meeting participants can manage discussion items" ON public.discussion_items;

-- Create new simplified policies without cross-table references

-- Meetings policies - only check direct ownership
CREATE POLICY "Users can view their own meetings" ON public.meetings
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Users can create meetings" ON public.meetings
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own meetings" ON public.meetings
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own meetings" ON public.meetings
  FOR DELETE USING (created_by = auth.uid());

-- Meeting participants policies - direct access control
CREATE POLICY "Users can view their own participations" ON public.meeting_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert participations for their meetings" ON public.meeting_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update participations for their meetings" ON public.meeting_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete participations for their meetings" ON public.meeting_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id AND created_by = auth.uid()
    )
  );

-- Todos policies - direct ownership and assignment
CREATE POLICY "Users can view their assigned or created todos" ON public.todos
  FOR SELECT USING (
    assigned_to = auth.uid() OR 
    created_by = auth.uid()
  );

CREATE POLICY "Users can create todos for their meetings" ON public.todos
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update their assigned or created todos" ON public.todos
  FOR UPDATE USING (
    assigned_to = auth.uid() OR 
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete todos they created" ON public.todos
  FOR DELETE USING (created_by = auth.uid());

-- Discussion items policies - direct ownership
CREATE POLICY "Users can view discussion items from their meetings" ON public.discussion_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create discussion items for their meetings" ON public.discussion_items
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.meetings 
      WHERE id = meeting_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update discussion items they created" ON public.discussion_items
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete discussion items they created" ON public.discussion_items
  FOR DELETE USING (created_by = auth.uid());

-- Create a function to get user's meetings (including as participant)
-- This will be used by the application layer instead of RLS policies
CREATE OR REPLACE FUNCTION get_user_meetings(user_uuid UUID)
RETURNS TABLE(meeting_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id
  FROM public.meetings m
  WHERE m.created_by = user_uuid
  UNION
  SELECT mp.meeting_id
  FROM public.meeting_participants mp
  WHERE mp.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_meetings(UUID) TO authenticated;
