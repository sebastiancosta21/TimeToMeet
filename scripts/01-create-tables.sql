-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  location TEXT,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meeting participants table
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  email TEXT, -- For inviting users who don't have accounts yet
  role TEXT DEFAULT 'participant' CHECK (role IN ('organizer', 'participant')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create todos table
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_email TEXT, -- For assigning to users who don't have accounts yet
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  due_date DATE,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create discussion items (IDS) table
CREATE TABLE IF NOT EXISTS public.discussion_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_items ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for meetings
CREATE POLICY "Users can view meetings they're involved in" ON public.meetings
  FOR SELECT USING (
    created_by = auth.uid() OR 
    id IN (
      SELECT meeting_id FROM public.meeting_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create meetings" ON public.meetings
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Meeting creators can update their meetings" ON public.meetings
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Meeting creators can delete their meetings" ON public.meetings
  FOR DELETE USING (created_by = auth.uid());

-- Create policies for meeting participants
CREATE POLICY "Users can view participants of their meetings" ON public.meeting_participants
  FOR SELECT USING (
    user_id = auth.uid() OR
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Meeting creators can manage participants" ON public.meeting_participants
  FOR ALL USING (
    meeting_id IN (
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

-- Create policies for todos
CREATE POLICY "Users can view todos from their meetings" ON public.todos
  FOR SELECT USING (
    assigned_to = auth.uid() OR
    created_by = auth.uid() OR
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Meeting participants can create todos" ON public.todos
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_participants 
      WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Todo creators and assignees can update todos" ON public.todos
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid()
  );

-- Create policies for discussion items
CREATE POLICY "Users can view discussion items from their meetings" ON public.discussion_items
  FOR SELECT USING (
    created_by = auth.uid() OR
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_participants 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Meeting participants can manage discussion items" ON public.discussion_items
  FOR ALL USING (
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_participants 
      WHERE user_id = auth.uid()
      UNION
      SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );
