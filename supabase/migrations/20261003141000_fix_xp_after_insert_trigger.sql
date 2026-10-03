-- Fix the generic XP trigger so it does not reference columns that do not exist on the table firing it.
-- In particular, events were failing because the old trigger evaluated NEW.role before reaching
-- the events branch, so create_event_secure rolled back and no event card survived refresh.

create or replace function private.xp_after_insert()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_xp bigint;
  row_json jsonb := to_jsonb(new);
  v_user_id uuid;
  v_ref_id uuid;
begin
  if tg_table_name = 'cp_thread_messages' then
    v_user_id := nullif(row_json->>'user_id','')::uuid;
    v_ref_id := nullif(row_json->>'id','')::uuid;
    v_xp := private.award_circle_panda_xp(v_user_id,'message',v_ref_id);
  elsif tg_table_name = 'cp_group_messages' then
    v_user_id := coalesce(nullif(row_json->>'author_id','')::uuid, nullif(row_json->>'user_id','')::uuid);
    v_ref_id := nullif(row_json->>'id','')::uuid;
    v_xp := private.award_circle_panda_xp(v_user_id,'group_message',v_ref_id);
  elsif tg_table_name = 'groups' then
    v_user_id := nullif(row_json->>'owner_id','')::uuid;
    v_ref_id := nullif(row_json->>'id','')::uuid;
    v_xp := private.award_circle_panda_xp(v_user_id,'create_group',v_ref_id);
  elsif tg_table_name = 'group_members' and coalesce(row_json->>'role','') = 'member' then
    v_user_id := nullif(row_json->>'user_id','')::uuid;
    v_ref_id := nullif(row_json->>'group_id','')::uuid;
    v_xp := private.award_circle_panda_xp(v_user_id,'join_group',v_ref_id);
  elsif tg_table_name = 'events' then
    v_user_id := nullif(row_json->>'owner_id','')::uuid;
    v_ref_id := nullif(row_json->>'id','')::uuid;
    v_xp := private.award_circle_panda_xp(v_user_id,'create_event',v_ref_id);
  elsif tg_table_name = 'crush_votes' then
    v_user_id := nullif(row_json->>'user_id','')::uuid;
    v_ref_id := nullif(row_json->>'nominee_id','')::uuid;
    v_xp := private.award_circle_panda_xp(v_user_id,'wcw_mcm_vote',v_ref_id);
  elsif tg_table_name = 'cp_reward_spin_attempts' then
    v_user_id := nullif(row_json->>'user_id','')::uuid;
    v_ref_id := nullif(row_json->>'id','')::uuid;
    v_xp := private.award_circle_panda_xp(v_user_id,'reward_wheel_spin',v_ref_id);
  elsif tg_table_name = 'hot_seat_gifts' then
    v_user_id := nullif(row_json->>'user_id','')::uuid;
    v_ref_id := nullif(row_json->>'id','')::uuid;
    v_xp := private.award_circle_panda_xp(v_user_id,'gift_purchase',v_ref_id);
  end if;
  return new;
end
$function$;