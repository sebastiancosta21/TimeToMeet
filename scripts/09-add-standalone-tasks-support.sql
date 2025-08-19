-- Add support for standalone tasks and task ordering
ALTER TABLE todos 
ALTER COLUMN meeting_id DROP NOT NULL,
ADD COLUMN order_index INTEGER DEFAULT 0;

-- Update existing tasks to have order_index based on creation date
UPDATE todos 
SET order_index = (
  SELECT ROW_NUMBER() OVER (PARTITION BY assigned_to ORDER BY created_at) - 1
  FROM todos t2 
  WHERE t2.id = todos.id
);

-- Create index for better performance on ordering queries
CREATE INDEX IF NOT EXISTS idx_todos_assigned_to_order ON todos(assigned_to, order_index);
