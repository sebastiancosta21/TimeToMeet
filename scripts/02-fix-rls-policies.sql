-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view meetings they're involved in" ON public.meetings;
DROP POLICY IF EXISTS "Users can view participants of their meetings" ON public.meeting_participants;
DROP POLICY IF EXISTS "Meeting creators can manage participants" ON public.meeting_participants;
DROP POLICY IF EXISTS "Users can view todos from their meetings" ON public.todos;
DROP POLICY IF EXISTS "Meeting participants can create todos" ON public.todos;
DROP POLICY IF EXISTS "Users can view discussion items from their meetings" ON public.discussion_items;
DROP POLICY IF EXISTS "Meeting participants can manage discussion items" ON public.discussion_items;

-- Simplified policies to avoid circular references

-- Fixed meetings policies - only check direct ownership
CREATE POLICY "Users can view their own meetings" ON public.meetings
  FOR SELECT USING (created_by = auth.uid());

-- Fixed meeting_participants policies - simplified access control
CREATE POLICY "Users can view their own participations" ON public.meeting_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Meeting creators can view all participants" ON public.meeting_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Meeting creators can manage participants" ON public.meeting_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );

-- Fixed todos policies - simplified to avoid recursion
CREATE POLICY "Users can view their assigned todos" ON public.todos
  FOR SELECT USING (assigned_to = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Meeting creators can view meeting todos" ON public.todos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create todos" ON public.todos
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Todo creators and assignees can update todos" ON public.todos
  FOR UPDATE USING (created_by = auth.uid() OR assigned_to = auth.uid());

-- Fixed discussion items policies - simplified to avoid recursion
CREATE POLICY "Users can view their created discussion items" ON public.discussion_items
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Meeting creators can view meeting discussion items" ON public.discussion_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create discussion items" ON public.discussion_items
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Discussion item creators can update their items" ON public.discussion_items
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Meeting creators can update meeting discussion items" ON public.discussion_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meetings m 
      WHERE m.id = meeting_id AND m.created_by = auth.uid()
    )
  );
