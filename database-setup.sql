-- ==============================================================================
-- HANGOUT + PANG FOREVER ♡ Database Schema & Security Setup
-- Fully compatible with Supabase PostgreSQL, Auth, Realtime, & Storage
-- ==============================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  email text,
  avatar_url text,
  avatar_config jsonb default '{"skin":"#ffe0bd","hair":"bubblegum","hairColor":"#ffb3ba","eyes":"sparkle","clothes":"hoodie","clothesColor":"#baffc9","accessory":"cat_ears","background":"pastel_clouds"}'::jsonb,
  bio text default 'Hello! I just joined HANGOUT ♡ Let''s be friends!',
  cover_url text,
  xp integer default 0 check (xp >= 0),
  level integer default 1 check (level >= 1),
  friendship_points integer default 0 check (friendship_points >= 0),
  account_status text default 'active' check (account_status in ('active', 'suspended', 'banned')),
  is_leaderboard_hidden boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for searching users
create index if not exists idx_profiles_username on public.profiles (username);
create index if not exists idx_profiles_xp on public.profiles (xp desc);

-- ------------------------------------------------------------------------------
-- 2. USER ROLES TABLE & HELPER FUNCTIONS
-- ------------------------------------------------------------------------------
create table if not exists public.user_roles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  role text not null check (role in ('admin', 'moderator', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, role)
);

create index if not exists idx_user_roles_user on public.user_roles (user_id);

-- Secure role checking functions with SECURITY DEFINER
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and role = 'admin'
  );
$$;

create or replace function public.is_moderator(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = check_user_id and role in ('admin', 'moderator')
  );
$$;

-- ------------------------------------------------------------------------------
-- 3. ADMIN NOTIFICATIONS TABLE (OWNER-ONLY)
-- ------------------------------------------------------------------------------
create table if not exists public.admin_notifications (
  id uuid default gen_random_uuid() primary key,
  type text not null check (type in ('new_registration', 'report_filed', 'suspicious_activity', 'system')),
  title text not null,
  message text not null,
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_admin_notifs_created on public.admin_notifications (created_at desc);

-- ------------------------------------------------------------------------------
-- 4. USER NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_user_notifs_user on public.user_notifications (user_id, created_at desc);

-- ------------------------------------------------------------------------------
-- 5. GROUPS & GROUP MEMBERS
-- ------------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  icon_url text,
  cover_url text,
  category text not null,
  is_private boolean default false,
  rules text default 'Be kind, respectful, and cozy ♡',
  member_limit integer default 100,
  member_count integer default 1,
  is_featured boolean default false,
  is_suspended boolean default false,
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_groups_category on public.groups (category);
create index if not exists idx_groups_featured on public.groups (is_featured);

create table if not exists public.group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  role text default 'member' check (role in ('owner', 'admin', 'moderator', 'member')),
  status text default 'approved' check (status in ('approved', 'pending_approval')),
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (group_id, user_id)
);

create index if not exists idx_group_members_lookup on public.group_members (group_id, user_id);

create table if not exists public.group_invitations (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups on delete cascade not null,
  inviter_id uuid references auth.users on delete cascade not null,
  invitee_id uuid references auth.users on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 6. PRIVATE CONVERSATIONS & FRIENDSHIPS
-- ------------------------------------------------------------------------------
create table if not exists public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  friend_id uuid references auth.users on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, friend_id)
);

create table if not exists public.conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.conversation_members (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (conversation_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 7. MESSAGES (GROUPS & 1-ON-1)
-- ------------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups on delete cascade,
  conversation_id uuid references public.conversations on delete cascade,
  sender_id uuid references auth.users on delete set null not null,
  content text not null,
  image_url text,
  reply_to_id uuid references public.messages on delete set null,
  reactions jsonb default '{}'::jsonb,
  is_pinned boolean default false,
  is_edited boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint message_target_check check (
    (group_id is not null and conversation_id is null) or
    (conversation_id is not null and group_id is null)
  )
);

create index if not exists idx_messages_group on public.messages (group_id, created_at asc);
create index if not exists idx_messages_conversation on public.messages (conversation_id, created_at asc);

-- ------------------------------------------------------------------------------
-- 8. COMMUNITY POSTS & COMMENTS
-- ------------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references auth.users on delete cascade not null,
  category text default 'Random Thoughts' check (category in ('Latest', 'Trending', 'Popular', 'Questions', 'Random Thoughts', 'Creative Posts')),
  content text not null,
  image_url text,
  is_anonymous boolean default false,
  likes_count integer default 0 check (likes_count >= 0),
  comments_count integer default 0 check (comments_count >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_posts_category on public.posts (category, created_at desc);

create table if not exists public.post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts on delete cascade not null,
  author_id uuid references auth.users on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.post_reactions (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  emoji text default '❤️',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (post_id, user_id)
);

-- ------------------------------------------------------------------------------
-- 9. PANG FOREVER ♡ (TASK ENGINE & GROUP CHALLENGES)
-- ------------------------------------------------------------------------------
create table if not exists public.task_templates (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text not null,
  category text not null check (category in ('Personal', 'Friendship', 'Group Challenges', 'Creative', 'Funny Random Tasks', 'Daily Missions', 'Surprise Missions')),
  difficulty text default 'Easy' check (difficulty in ('Easy', 'Medium', 'Special')),
  xp_reward integer default 25 check (xp_reward > 0),
  friendship_points integer default 10 check (friendship_points >= 0),
  task_type text default 'individual' check (task_type in ('individual', 'group')),
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.task_assignments (
  id uuid default gen_random_uuid() primary key,
  task_template_id uuid references public.task_templates on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  status text default 'assigned' check (status in ('assigned', 'completed', 'skipped')),
  user_submission text,
  completion_evidence_url text,
  assigned_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

create index if not exists idx_task_assignments_user on public.task_assignments (user_id, status);

create table if not exists public.group_missions (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references public.groups on delete cascade not null,
  task_template_id uuid references public.task_templates on delete cascade not null,
  status text default 'in_progress' check (status in ('in_progress', 'completed')),
  target_contributions integer default 3,
  current_contributions integer default 0,
  contributions jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

create index if not exists idx_group_missions_group on public.group_missions (group_id, status);

-- ------------------------------------------------------------------------------
-- 10. REWARDS & AVATAR ITEMS
-- ------------------------------------------------------------------------------
create table if not exists public.user_rewards (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  badge_id text not null,
  badge_name text not null,
  badge_icon text not null,
  unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, badge_id)
);

create table if not exists public.avatar_items (
  id uuid default gen_random_uuid() primary key,
  category text not null check (category in ('skin', 'hair', 'eyes', 'clothes', 'accessory', 'background')),
  name text not null,
  item_code text unique not null,
  preview_color text,
  svg_data text,
  is_starter boolean default true,
  xp_required integer default 0
);

create table if not exists public.user_avatar_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  item_id uuid references public.avatar_items on delete cascade not null,
  acquired_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, item_id)
);

-- ------------------------------------------------------------------------------
-- 11. MODERATION & REPORTS
-- ------------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid default gen_random_uuid() primary key,
  reporter_id uuid references auth.users on delete set null,
  target_type text not null check (target_type in ('post', 'message', 'profile', 'group')),
  target_id text not null,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'action_taken')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 12. ANNOUNCEMENTS & WEBSITE SETTINGS
-- ------------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  target_audience text default 'all' check (target_audience in ('all', 'group', 'member')),
  target_id text,
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.website_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 13. SECURE TRIGGERS & FUNCTIONS
-- ------------------------------------------------------------------------------

-- Trigger: When new user signs up in auth.users, create profile + admin notification
create or replace function public.handle_new_user_registration()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
  v_display_name text;
begin
  -- Extract metadata provided during registration
  v_username := coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8));
  v_display_name := coalesce(new.raw_user_meta_data->>'display_name', 'Cozy Friend');

  -- 1. Create public profile
  insert into public.profiles (
    id,
    username,
    display_name,
    email,
    bio,
    account_status
  ) values (
    new.id,
    v_username,
    v_display_name,
    new.email,
    'Hello! I just joined HANGOUT ♡ Let''s be friends!',
    'active'
  );

  -- 2. Assign default member role
  insert into public.user_roles (user_id, role)
  values (new.id, 'member')
  on conflict do nothing;

  -- 3. Create HIGH PRIORITY Admin Registration Notification
  insert into public.admin_notifications (
    type,
    title,
    message,
    data
  ) values (
    'new_registration',
    'NEW MEMBER REGISTERED! 🎉',
    'New member ' || v_display_name || ' (@' || v_username || ') has joined HANGOUT!',
    jsonb_build_object(
      'user_id', new.id,
      'username', v_username,
      'display_name', v_display_name,
      'email', new.email,
      'registered_at', now(),
      'email_confirmed', (new.email_confirmed_at is not null)
    )
  );

  -- 4. Create welcome notification for user
  insert into public.user_notifications (
    user_id,
    type,
    title,
    message,
    link
  ) values (
    new.id,
    'welcome',
    'Welcome to HANGOUT! ♡',
    'We are so happy you are here! Check out PANG FOREVER to complete your first cozy mission.',
    '#pang'
  );

  return new;
end;
$$;

-- Connect trigger to auth.users table
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user_registration();


-- Secure function: Complete task and award XP + badges safely in SQL
create or replace function public.complete_task(
  p_assignment_id uuid,
  p_submission text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_task_xp integer;
  v_task_fp integer;
  v_current_xp integer;
  v_new_xp integer;
  v_new_level integer;
  v_task_title text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Fetch assignment and verify ownership
  select t.xp_reward, t.friendship_points, t.title
  into v_task_xp, v_task_fp, v_task_title
  from public.task_assignments a
  join public.task_templates t on a.task_template_id = t.id
  where a.id = p_assignment_id and a.user_id = v_user_id and a.status = 'assigned';

  if not found then
    raise exception 'Assignment not found or already completed';
  end if;

  -- Update assignment status
  update public.task_assignments
  set status = 'completed',
      user_submission = p_submission,
      completed_at = now()
  where id = p_assignment_id;

  -- Update profile XP and calculate level (each level requires Level * 100 XP)
  select xp into v_current_xp from public.profiles where id = v_user_id;
  v_new_xp := coalesce(v_current_xp, 0) + v_task_xp;
  v_new_level := greatest(1, floor(sqrt(v_new_xp / 50.0)) + 1);

  update public.profiles
  set xp = v_new_xp,
      level = v_new_level,
      friendship_points = friendship_points + v_task_fp,
      updated_at = now()
  where id = v_user_id;

  -- Award 'First Step' badge if first completion
  insert into public.user_rewards (user_id, badge_id, badge_name, badge_icon)
  values (v_user_id, 'first_mission', 'Pang Pioneer', '🌟')
  on conflict do nothing;

  -- Create notification
  insert into public.user_notifications (user_id, type, title, message)
  values (
    v_user_id,
    'mission_completed',
    'Mission Completed! ♡',
    'You earned +' || v_task_xp || ' XP for completing "' || v_task_title || '"!'
  );

  return jsonb_build_object(
    'success', true,
    'xp_earned', v_task_xp,
    'total_xp', v_new_xp,
    'level', v_new_level
  );
end;
$$;

-- Secure function: Contribute to group mission
create or replace function public.contribute_group_mission(
  p_mission_id uuid,
  p_contribution_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_user_name text;
  v_mission record;
  v_new_contribs jsonb;
  v_new_count integer;
  v_new_status text;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select display_name into v_user_name from public.profiles where id = v_user_id;

  select * into v_mission from public.group_missions where id = p_mission_id and status = 'in_progress';
  if not found then
    raise exception 'Mission not found or already completed';
  end if;

  -- Append contribution
  v_new_contribs := v_mission.contributions || jsonb_build_array(
    jsonb_build_object(
      'user_id', v_user_id,
      'display_name', coalesce(v_user_name, 'Cozy Friend'),
      'text', p_contribution_text,
      'created_at', now()
    )
  );

  v_new_count := v_mission.current_contributions + 1;
  v_new_status := case when v_new_count >= v_mission.target_contributions then 'completed' else 'in_progress' end;

  update public.group_missions
  set current_contributions = v_new_count,
      contributions = v_new_contribs,
      status = v_new_status,
      completed_at = case when v_new_status = 'completed' then now() else null end
  where id = p_mission_id;

  -- If completed, award all group members XP
  if v_new_status = 'completed' then
    update public.profiles p
    set xp = p.xp + 50
    where id in (
      select user_id from public.group_members where group_id = v_mission.group_id
    );
  end if;

  return jsonb_build_object('success', true, 'status', v_new_status, 'current_contributions', v_new_count);
end;
$$;

-- ------------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.admin_notifications enable row level security;
alter table public.user_notifications enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;
alter table public.messages enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.friendships enable row level security;
alter table public.posts enable row level security;
alter table public.post_comments enable row level security;
alter table public.post_reactions enable row level security;
alter table public.task_templates enable row level security;
alter table public.task_assignments enable row level security;
alter table public.group_missions enable row level security;
alter table public.user_rewards enable row level security;
alter table public.avatar_items enable row level security;
alter table public.user_avatar_items enable row level security;
alter table public.reports enable row level security;
alter table public.announcements enable row level security;
alter table public.website_settings enable row level security;

-- PROFILES
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- USER ROLES
create policy "User roles viewable by admins and respective user" on public.user_roles
  for select using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy "Only admins can modify user roles" on public.user_roles
  for all using (public.is_admin(auth.uid()));

-- ADMIN NOTIFICATIONS: STRICT OWNER / ADMIN ONLY
create policy "Only admins can view admin notifications" on public.admin_notifications
  for select using (public.is_admin(auth.uid()));

create policy "Only admins can update admin notifications" on public.admin_notifications
  for update using (public.is_admin(auth.uid()));

-- USER NOTIFICATIONS
create policy "Users view own notifications" on public.user_notifications
  for select using (auth.uid() = user_id);

create policy "Users update own notifications" on public.user_notifications
  for update using (auth.uid() = user_id);

-- GROUPS
create policy "Public groups or joined groups are viewable" on public.groups
  for select using (
    not is_private or
    auth.uid() = created_by or
    exists (select 1 from public.group_members where group_id = id and user_id = auth.uid()) or
    public.is_admin(auth.uid())
  );

create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.role() = 'authenticated');

create policy "Group owners, mods or admins can update groups" on public.groups
  for update using (
    auth.uid() = created_by or
    exists (select 1 from public.group_members where group_id = id and user_id = auth.uid() and role in ('owner', 'admin')) or
    public.is_admin(auth.uid())
  );

-- GROUP MEMBERS
create policy "Members list viewable by group viewers" on public.group_members
  for select using (true);

create policy "Users can join public groups" on public.group_members
  for insert with check (auth.uid() = user_id);

create policy "Group mods can update members" on public.group_members
  for update using (
    auth.uid() = user_id or
    exists (select 1 from public.group_members gm where gm.group_id = group_id and gm.user_id = auth.uid() and gm.role in ('owner', 'admin')) or
    public.is_admin(auth.uid())
  );

-- MESSAGES: STRICT ACCESS
create policy "Group members can view group messages" on public.messages
  for select using (
    (group_id is not null and exists (select 1 from public.group_members where group_id = messages.group_id and user_id = auth.uid()))
    or
    (conversation_id is not null and exists (select 1 from public.conversation_members where conversation_id = messages.conversation_id and user_id = auth.uid()))
  );

create policy "Authorized members can post messages" on public.messages
  for insert with check (
    auth.uid() = sender_id and (
      (group_id is not null and exists (select 1 from public.group_members where group_id = messages.group_id and user_id = auth.uid()))
      or
      (conversation_id is not null and exists (select 1 from public.conversation_members where conversation_id = messages.conversation_id and user_id = auth.uid()))
    )
  );

create policy "Users can edit or delete their own messages" on public.messages
  for update using (auth.uid() = sender_id);

create policy "Users can delete own messages" on public.messages
  for delete using (auth.uid() = sender_id);

-- CONVERSATIONS & CONVERSATION MEMBERS
create policy "Conversation participants can view conversation" on public.conversations
  for select using (
    exists (select 1 from public.conversation_members where conversation_id = id and user_id = auth.uid())
  );

create policy "Conversation participants view member links" on public.conversation_members
  for select using (
    user_id = auth.uid() or
    exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_id and cm.user_id = auth.uid())
  );

-- FRIENDSHIPS
create policy "Users view own friendships" on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "Users manage own friendships" on public.friendships
  for insert with check (auth.uid() = user_id);

create policy "Users update own friendships" on public.friendships
  for update using (auth.uid() = user_id or auth.uid() = friend_id);

-- COMMUNITY POSTS
create policy "Posts are viewable by everyone" on public.posts
  for select using (true);

create policy "Authenticated users can create posts" on public.posts
  for insert with check (auth.role() = 'authenticated' and auth.uid() = author_id);

create policy "Authors and moderators can update posts" on public.posts
  for update using (auth.uid() = author_id or public.is_moderator(auth.uid()));

create policy "Authors and moderators can delete posts" on public.posts
  for delete using (auth.uid() = author_id or public.is_moderator(auth.uid()));

-- POST COMMENTS & REACTIONS
create policy "Post comments viewable by all" on public.post_comments
  for select using (true);

create policy "Users can add comments" on public.post_comments
  for insert with check (auth.role() = 'authenticated' and auth.uid() = author_id);

create policy "Post reactions viewable by all" on public.post_reactions
  for select using (true);

create policy "Users manage own reactions" on public.post_reactions
  for all using (auth.uid() = user_id);

-- TASK TEMPLATES
create policy "Task templates viewable by all" on public.task_templates
  for select using (is_active = true or public.is_admin(auth.uid()));

create policy "Only admins can modify task templates" on public.task_templates
  for all using (public.is_admin(auth.uid()));

-- TASK ASSIGNMENTS
create policy "Users view own task assignments" on public.task_assignments
  for select using (auth.uid() = user_id);

create policy "Users manage own task assignments" on public.task_assignments
  for all using (auth.uid() = user_id);

-- GROUP MISSIONS
create policy "Group missions viewable by group members" on public.group_missions
  for select using (
    exists (select 1 from public.group_members where group_id = group_missions.group_id and user_id = auth.uid()) or
    public.is_admin(auth.uid())
  );

-- WEBSITE SETTINGS
create policy "Website settings viewable by everyone" on public.website_settings
  for select using (true);

create policy "Only admins can update website settings" on public.website_settings
  for all using (public.is_admin(auth.uid()));

-- ANNOUNCEMENTS
create policy "Announcements viewable by target" on public.announcements
  for select using (true);

create policy "Only admins can manage announcements" on public.announcements
  for all using (public.is_admin(auth.uid()));

-- REPORTS
create policy "Users can submit reports" on public.reports
  for insert with check (auth.role() = 'authenticated');

create policy "Only moderators and admins can view and manage reports" on public.reports
  for all using (public.is_moderator(auth.uid()));

-- ------------------------------------------------------------------------------
-- 15. SEED INITIAL DATA (TASKS, SETTINGS, AVATAR ITEMS)
-- ------------------------------------------------------------------------------

-- Seed Website Settings
insert into public.website_settings (key, value)
values
  ('site_info', '{
    "site_name": "HANGOUT",
    "tagline": "Find your people. Create your space. Make every day a little more fun.",
    "welcome_message": "Welcome to HANGOUT! A cozy corner of the internet where cute avatars, friendly group chats, and playful missions come together ♡",
    "announcement_banner": "🌸 PANG FOREVER Spring Challenge is live! Complete missions to earn the cozy floral badge!"
  }'::jsonb),
  ('community_rules', '{
    "rules": [
      "1. Be kind, welcoming, and inclusive to everyone.",
      "2. Respect privacy: never share private messages or personal details.",
      "3. Keep all community spaces cozy and safe for all ages.",
      "4. No spamming, harmful links, or unsolicited advertising.",
      "5. Have fun, celebrate small wins, and share gentle vibes!"
    ]
  }'::jsonb)
on conflict (key) do nothing;

-- Seed PANG FOREVER Task Templates
insert into public.task_templates (title, description, category, difficulty, xp_reward, friendship_points, task_type)
values
  -- Personal Tasks
  ('Share a Happy Memory', 'Write down a cozy or funny memory from your childhood or recent week that brought a smile to your face.', 'Personal', 'Easy', 25, 10, 'individual'),
  ('Three Grateful Moments', 'Name 3 little things that you are deeply grateful for right now (e.g. warm tea, good music, cozy blanket).', 'Personal', 'Easy', 25, 10, 'individual'),
  ('Mood Check-In', 'Describe your current mood using 3 cute emojis and one comforting sentence.', 'Personal', 'Easy', 20, 5, 'individual'),
  ('Comfort Song Recommendation', 'Share a favorite gentle song or melody that instantly soothes your soul.', 'Personal', 'Easy', 25, 10, 'individual'),
  ('Interesting Fun Fact About You', 'Tell your community one quirky, wonderful, or unexpected hobby or fact about yourself.', 'Personal', 'Medium', 35, 15, 'individual'),

  -- Friendship Tasks
  ('Send a Genuine Compliment', 'Leave a heartfelt compliment on someone''s post or send a kind message to a friend.', 'Friendship', 'Easy', 30, 25, 'individual'),
  ('Welcome a New Member', 'Find a recent introduction in Community or a new member in a group and warmly welcome them to HANGOUT.', 'Friendship', 'Easy', 30, 25, 'individual'),
  ('Ask a Fun Icebreaker', 'Ask a friend or group: "If you could open any cozy themed cafe, what would its specialty drink be?"', 'Friendship', 'Easy', 25, 20, 'individual'),
  ('Send a Virtual Warm Hug', 'Post an encouraging message in the community feed wishing everyone a peaceful and refreshing day.', 'Friendship', 'Easy', 25, 15, 'individual'),

  -- Creative Tasks
  ('Invent an Imaginary Cafe Drink', 'Describe a whimsical signature drink with a cute name, ingredients, and colorful appearance.', 'Creative', 'Medium', 40, 20, 'individual'),
  ('Write a 3-Sentence Tiny Story', 'Write a miniature story about a lost kitten who found a magic library.', 'Creative', 'Medium', 45, 20, 'individual'),
  ('Design Your Dream Cozy Room', 'Describe what your ultimate dream reading nook or study sanctuary would look like.', 'Creative', 'Medium', 35, 15, 'individual'),

  -- Funny Random Tasks
  ('Sentence Without the Letter A', 'Write a funny or poetic sentence without using the letter ''A'' even once!', 'Funny Random Tasks', 'Medium', 40, 15, 'individual'),
  ('Invent a Brand New Holiday', 'Create a silly or lovely new holiday (e.g. International Cozy Socks Day) and how it should be celebrated.', 'Funny Random Tasks', 'Easy', 30, 15, 'individual'),
  ('Ridiculous Superhero Persona', 'If your superpower was minor convenience (e.g., instant toast, untangled cords), what is your superhero name?', 'Funny Random Tasks', 'Easy', 25, 10, 'individual'),

  -- Group Challenges
  ('Pass-the-Story Relay', 'Each group member contributes exactly one sentence to build an epic, silly group adventure.', 'Group Challenges', 'Special', 75, 50, 'group'),
  ('Group Mascot Brainstorm', 'Work together to pick a group animal mascot, a cute name, and its favorite food.', 'Group Challenges', 'Special', 60, 40, 'group'),
  ('Two Truths and One Cute Lie', 'Everyone in the group shares two real facts and one playful fake one for others to guess.', 'Group Challenges', 'Special', 50, 35, 'group')
on conflict do nothing;

-- Seed Starter Groups
insert into public.groups (name, description, category, is_private, rules, member_limit, member_count, is_featured)
values
  ('The Cozy Tea Lounge', 'Sip warm tea, share calm thoughts, and discuss favorite books and relaxing moments ♡', 'General Hangout', false, 'Relax, be kind, and no stressful topics.', 150, 42, true),
  ('Study Buddies & Lo-Fi', 'Pomodoro sessions, study goals, gentle accountability, and lo-fi beats playlists.', 'Study Buddies', false, 'Focus sessions, support each other, share study tips.', 200, 68, true),
  ('Pixel & Pastel Artists', 'A safe haven for digital artists, traditional painters, animators, and cozy doodle lovers!', 'Art and Creativity', false, 'Constructive feedback only, credit artists.', 120, 54, true),
  ('Indie Game Sanctuary', 'Discuss cozy games (Animal Crossing, Stardew Valley, cozy RPGs) and find co-op buddies.', 'Gaming', false, 'No spoilers without warnings, friendly play only.', 100, 39, false),
  ('Melody & Chill', 'Share ambient tracks, city pop gems, bedroom indie, and relaxing music recommendations.', 'Music', false, 'Share songs with links, respect musical tastes.', 100, 31, false)
on conflict do nothing;

-- ------------------------------------------------------------------------------
-- 16. OWNER ASSIGNMENT INSTRUCTIONS (FOR README & SQL QUERY)
-- ------------------------------------------------------------------------------
-- To assign yourself as the owner / admin after creating your Supabase account:
-- 1. Sign up on the HANGOUT website with your email.
-- 2. Run this SQL statement in the Supabase SQL Editor:
--
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES (
--   (SELECT id FROM auth.users WHERE email = 'your_email@example.com'),
--   'admin'
-- ) ON CONFLICT DO NOTHING;
-- ==============================================================================
