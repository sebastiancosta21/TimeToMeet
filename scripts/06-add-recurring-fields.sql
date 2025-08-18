-- Add recurring meeting fields to meetings table
ALTER TABLE public.meetings 
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurrence_frequency TEXT CHECK (recurrence_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')) DEFAULT 'weekly';

-- Update existing meetings to be non-recurring
UPDATE public.meetings SET is_recurring = false WHERE is_recurring IS NULL;
