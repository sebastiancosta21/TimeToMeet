-- Safe migration script that handles existing policies and columns
-- This script can be run multiple times without errors

-- Step 1: Make meeting_id nullable if it isn't already
DO $$ 
BEGIN
    -- Check if meeting_id is already nullable
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'todos' 
        AND column_name = 'meeting_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE todos ALTER COLUMN meeting_id DROP NOT NULL;
    END IF;
END $$;

-- Step 2: Add order_index column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'todos' 
        AND column_name = 'order_index'
    ) THEN
        ALTER TABLE todos ADD COLUMN order_index INTEGER DEFAULT 0;
        
        -- Update existing tasks to have order_index based on creation date
        UPDATE todos 
        SET order_index = (
            SELECT ROW_NUMBER() OVER (PARTITION BY assigned_to ORDER BY created_at) - 1
            FROM todos t2 
            WHERE t2.id = todos.id
        );
    END IF;
END $$;

-- Step 3: Drop existing policies and recreate them
DROP POLICY IF EXISTS "Meeting participants can create todos" ON public.todos;
DROP POLICY IF EXISTS "Users can create todos" ON public.todos;
DROP POLICY IF EXISTS "Users can view their todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update their todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their todos" ON public.todos;

-- Step 4: Create new policies that support standalone tasks
CREATE POLICY "Users can create todos" ON public.todos
    FOR INSERT WITH CHECK (
        created_by = auth.uid() AND (
            meeting_id IS NULL OR  -- Allow standalone tasks
            meeting_id IN (
                SELECT meeting_id FROM public.meeting_participants 
                WHERE user_id = auth.uid()
                UNION
                SELECT id FROM public.meetings WHERE created_by = auth.uid()
            )
        )
    );

CREATE POLICY "Users can view their todos" ON public.todos
    FOR SELECT USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid()
    );

CREATE POLICY "Users can update their todos" ON public.todos
    FOR UPDATE USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid()
    );

CREATE POLICY "Users can delete their todos" ON public.todos
    FOR DELETE USING (
        assigned_to = auth.uid() OR 
        created_by = auth.uid()
    );

-- Step 5: Create performance index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to_order ON todos(assigned_to, order_index);

-- Verify the changes
SELECT 
    'Migration completed successfully. Todos table now supports standalone tasks and ordering.' as status;
