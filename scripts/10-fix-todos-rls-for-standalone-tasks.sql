-- Fix RLS policies to allow standalone tasks and add missing columns

-- First, make meeting_id nullable to support standalone tasks
ALTER TABLE todos ALTER COLUMN meeting_id DROP NOT NULL;

-- Add order_index column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'todos' AND column_name = 'order_index') THEN
        ALTER TABLE todos ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update existing tasks to have order_index based on creation date
UPDATE todos 
SET order_index = (
  SELECT ROW_NUMBER() OVER (PARTITION BY assigned_to ORDER BY created_at) - 1
  FROM todos t2 
  WHERE t2.id = todos.id
)
WHERE order_index IS NULL;

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Meeting participants can create todos" ON public.todos;

-- Create new INSERT policy that allows both meeting-related and standalone tasks
CREATE POLICY "Users can create todos" ON public.todos
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND (
      -- Allow standalone tasks (no meeting)
      meeting_id IS NULL OR
      -- Allow meeting-related tasks if user is participant or creator
      meeting_id IN (
        SELECT meeting_id FROM public.meeting_participants 
        WHERE user_id = auth.uid()
        UNION
        SELECT id FROM public.meetings WHERE created_by = auth.uid()
      )
    )
  );

-- Create index for better performance on ordering queries
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to_order ON todos(assigned_to, order_index);

-- Update the SELECT policy to include standalone tasks
DROP POLICY IF EXISTS "Users can view todos from their meetings" ON public.todos;

CREATE POLICY "Users can view their todos" ON public.todos
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    (meeting_id IS NOT NULL AND meeting_id IN (
      SELECT meeting_id FROM public.meeting_participants 
      WHERE user_id = auth.uid()
    ))
  );
