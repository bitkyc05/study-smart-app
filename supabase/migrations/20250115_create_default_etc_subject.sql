-- Create function to initialize default "Etc" subject for new users
create or replace function public.handle_new_user_etc_subject()
returns trigger as $$
begin
  -- Insert default "Etc" subject for new user
  insert into public.subjects (user_id, name, color_hex)
  values (new.id, 'Etc', '#9E9E9E');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger to auto-create "Etc" subject for new users
create trigger on_auth_user_created_etc_subject
  after insert on auth.users
  for each row execute function public.handle_new_user_etc_subject();