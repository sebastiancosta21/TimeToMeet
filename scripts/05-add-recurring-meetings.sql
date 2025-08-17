-- Add recurring field to meetings table
ALTER TABLE public.meetings 
ADD COLUMN is_recurring boolean DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.meetings.is_recurring IS 'Whether this meeting is recurring and can be run multiple times';

-- Update existing meetings to be non-recurring by default
UPDATE public.meetings SET is_recurring = false WHERE is_recurring IS NULL;
