-- ==========================================
-- ADD MISSING RLS POLICIES FOR CAMPUSCONNECT
-- ==========================================

-- 1. PROFILES
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 2. PROJECTS
CREATE POLICY "Public projects are viewable by everyone" 
ON public.projects FOR SELECT 
USING (true);

CREATE POLICY "Users can create projects" 
ON public.projects FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own projects" 
ON public.projects FOR UPDATE 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own projects" 
ON public.projects FOR DELETE 
USING (auth.uid() = profile_id);

-- 3. EVENTS
CREATE POLICY "Events are viewable by everyone" 
ON public.events FOR SELECT 
USING (true);

CREATE POLICY "Organizers and admins can insert events" 
ON public.events FOR INSERT 
WITH CHECK (
    auth.uid() = organizer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'club_admin'))
);

CREATE POLICY "Organizers and admins can update events" 
ON public.events FOR UPDATE 
USING (
    auth.uid() = organizer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'club_admin'))
);

CREATE POLICY "Organizers and admins can delete events" 
ON public.events FOR DELETE 
USING (
    auth.uid() = organizer_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'club_admin'))
);

-- 4. EVENT REGISTRATIONS
CREATE POLICY "Registrations are viewable by everyone" 
ON public.event_registrations FOR SELECT 
USING (true);

CREATE POLICY "Users can register themselves" 
ON public.event_registrations FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can unregister themselves" 
ON public.event_registrations FOR DELETE 
USING (auth.uid() = profile_id);

-- 5. NOTIFICATIONS
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = profile_id);

CREATE POLICY "Authenticated users can insert notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own notifications" 
ON public.notifications FOR DELETE 
USING (auth.uid() = profile_id);

-- 6. CONNECTION REQUESTS
CREATE POLICY "Users can view connection requests involving them" 
ON public.connection_requests FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send connection requests" 
ON public.connection_requests FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connection requests involving them" 
ON public.connection_requests FOR UPDATE 
USING (auth.uid() = recipient_id OR auth.uid() = requester_id);

CREATE POLICY "Users can delete connection requests involving them" 
ON public.connection_requests FOR DELETE 
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
