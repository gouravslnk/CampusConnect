-- Run this in Supabase SQL Editor if your CampusConnect database already exists.

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS available BOOLEAN DEFAULT TRUE;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS team_required BOOLEAN DEFAULT FALSE;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS team_size INT DEFAULT 4;

ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS required_skills TEXT[] DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    team_type TEXT DEFAULT 'project' CHECK (team_type IN ('event', 'project')),
    project_title TEXT,
    project_description TEXT,
    required_skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member')),
    status TEXT DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, profile_id)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Students can view teams they belong to'
    ) THEN
        CREATE POLICY "Students can view teams they belong to"
        ON public.teams FOR SELECT
        USING (
            owner_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.team_members
                WHERE team_members.team_id = teams.id
                AND team_members.profile_id = auth.uid()
            )
        );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'Students can create teams'
    ) THEN
        CREATE POLICY "Students can create teams"
        ON public.teams FOR INSERT
        WITH CHECK (owner_id = auth.uid());
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'team_members' AND policyname = 'Students can view their team memberships'
    ) THEN
        CREATE POLICY "Students can view their team memberships"
        ON public.team_members FOR SELECT
        USING (profile_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.teams
            WHERE teams.id = team_members.team_id
            AND teams.owner_id = auth.uid()
        ));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'team_members' AND policyname = 'Team owners can invite members'
    ) THEN
        CREATE POLICY "Team owners can invite members"
        ON public.team_members FOR INSERT
        WITH CHECK (EXISTS (
            SELECT 1 FROM public.teams
            WHERE teams.id = team_members.team_id
            AND teams.owner_id = auth.uid()
        ));
    END IF;
END $$;
