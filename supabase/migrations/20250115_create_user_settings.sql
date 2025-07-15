-- Create user_settings table for storing user preferences including study goals
create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  
  -- Study goals stored as JSONB for flexibility
  study_goals jsonb default '{
    "d_day": null,
    "d_day_title": "",
    "d_day_created_at": null,
    "total_goal_minutes": 0,
    "weekly_goal_minutes": 0,
    "subject_allocations": {},
    "include_etc_subject": true,
    "auto_rebalance": true
  }'::jsonb,
  
  -- Other preferences can be added here
  preferences jsonb default '{}'::jsonb,
  notifications jsonb default '{}'::jsonb,
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create unique index on user_id
create unique index user_settings_user_id_idx on public.user_settings(user_id);

-- Enable RLS
alter table public.user_settings enable row level security;

-- Create RLS policies
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

-- Create function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger handle_user_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.handle_updated_at();

-- Create function to initialize user settings on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to auto-create settings for new users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();