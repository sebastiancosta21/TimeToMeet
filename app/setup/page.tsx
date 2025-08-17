"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Copy, Database, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function SetupPage() {
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const sqlScript = `-- Create users table (extends Supabase auth.users)
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
  email TEXT,
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
  assigned_email TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done')),
  due_date DATE,
  created_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create discussion items table
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
    id IN (SELECT meeting_id FROM public.meeting_participants WHERE user_id = auth.uid())
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
    meeting_id IN (SELECT id FROM public.meetings WHERE created_by = auth.uid())
  );
CREATE POLICY "Meeting creators can manage participants" ON public.meeting_participants
  FOR ALL USING (
    meeting_id IN (SELECT id FROM public.meetings WHERE created_by = auth.uid())
  );

-- Create policies for todos
CREATE POLICY "Users can view todos from their meetings" ON public.todos
  FOR SELECT USING (
    assigned_to = auth.uid() OR created_by = auth.uid() OR
    meeting_id IN (SELECT meeting_id FROM public.meeting_participants WHERE user_id = auth.uid())
  );
CREATE POLICY "Meeting participants can create todos" ON public.todos
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_participants WHERE user_id = auth.uid()
      UNION SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );
CREATE POLICY "Todo creators and assignees can update todos" ON public.todos
  FOR UPDATE USING (created_by = auth.uid() OR assigned_to = auth.uid());

-- Create policies for discussion items
CREATE POLICY "Users can view discussion items from their meetings" ON public.discussion_items
  FOR SELECT USING (
    created_by = auth.uid() OR
    meeting_id IN (SELECT meeting_id FROM public.meeting_participants WHERE user_id = auth.uid())
  );
CREATE POLICY "Meeting participants can manage discussion items" ON public.discussion_items
  FOR ALL USING (
    meeting_id IN (
      SELECT meeting_id FROM public.meeting_participants WHERE user_id = auth.uid()
      UNION SELECT id FROM public.meetings WHERE created_by = auth.uid()
    )
  );`

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(sqlScript)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const checkDatabase = async () => {
    setChecking(true)
    try {
      // Try to query the meetings table to see if it exists
      const { data, error } = await supabase.from("meetings").select("id").limit(1)

      if (!error) {
        // Tables exist, redirect to dashboard
        router.push("/")
      } else {
        alert("Database tables not found. Please run the SQL script first.")
      }
    } catch (error) {
      alert("Database tables not found. Please run the SQL script first.")
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="text-center mb-8">
          <Database className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Setup Required</h1>
          <p className="text-gray-600">Your meeting app needs database tables to be created first.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-sm font-medium px-2.5 py-0.5 rounded">Step 1</span>
              Copy the SQL Script
            </CardTitle>
            <CardDescription>
              Copy the database setup script below to create all necessary tables and security policies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto max-h-96 overflow-y-auto">
                <code>{sqlScript}</code>
              </pre>
              <Button onClick={copyToClipboard} className="absolute top-2 right-2" size="sm" variant="secondary">
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-sm font-medium px-2.5 py-0.5 rounded">Step 2</span>
              Run in Supabase SQL Editor
            </CardTitle>
            <CardDescription>Open your Supabase project and run the SQL script in the SQL Editor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
              <li>Go to your Supabase project dashboard</li>
              <li>Navigate to the "SQL Editor" in the left sidebar</li>
              <li>Click "New Query" to create a new SQL query</li>
              <li>Paste the copied SQL script into the editor</li>
              <li>Click "Run" to execute the script</li>
              <li>Verify that all tables were created successfully</li>
            </ol>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                Open Supabase Dashboard
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-800 text-sm font-medium px-2.5 py-0.5 rounded">Step 3</span>
              Verify Setup
            </CardTitle>
            <CardDescription>
              Once you've run the SQL script, click below to verify the setup and continue to your meeting app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={checkDatabase} disabled={checking} className="w-full">
              {checking ? "Checking Database..." : "Verify Setup & Continue"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
