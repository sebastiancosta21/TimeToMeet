-- Add status column to meetings table
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'ended'));

-- Add ended_at timestamp for tracking when meetings end
ALTER TABLE public.meetings 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;

-- Update existing meetings to have 'scheduled' status
UPDATE public.meetings 
SET status = 'scheduled' 
WHERE status IS NULL;
