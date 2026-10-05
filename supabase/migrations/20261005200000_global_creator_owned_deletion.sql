-- Global creator-owned content deletion
create or replace function private.delete_post(p_post_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid; v_author uuid;
begin v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
select author_id into v_author from posts where id=p_post_id; if not found then raise exception 'POST_NOT_FOUND'; end if;
if v_author<>v_uid then raise exception 'NOT_POST_OWNER'; end if;
delete from posts where id=p_post_id; return jsonb_build_object('deleted',true,'post_id',p_post_id); end $$;

create or replace function private.delete_post_comment(p_comment_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid; v_author uuid;
begin v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
select author_id into v_author from post_comments where id=p_comment_id; if not found then raise exception 'COMMENT_NOT_FOUND'; end if;
if v_author<>v_uid then raise exception 'NOT_COMMENT_OWNER'; end if;
update post_comments set parent_id=null where parent_id=p_comment_id; delete from post_comments where id=p_comment_id;
return jsonb_build_object('deleted',true,'comment_id',p_comment_id); end $$;

create or replace function private.delete_secret_post(p_secret_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid; v_author uuid;
begin v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
select author_id into v_author from secret_posts where id=p_secret_id; if not found then raise exception 'SECRET_NOT_FOUND'; end if;
if v_author is null or v_author<>v_uid then raise exception 'NOT_SECRET_OWNER'; end if;
delete from secret_posts where id=p_secret_id; return jsonb_build_object('deleted',true,'secret_id',p_secret_id); end $$;

create or replace function private.delete_secret_comment(p_comment_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid; v_author uuid;
begin v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
select author_id into v_author from secret_comments where id=p_comment_id; if not found then raise exception 'COMMENT_NOT_FOUND'; end if;
if v_author is null or v_author<>v_uid then raise exception 'NOT_COMMENT_OWNER'; end if;
delete from secret_comments where id=p_comment_id; return jsonb_build_object('deleted',true,'comment_id',p_comment_id); end $$;

create or replace function private.delete_event(p_event_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid; v_creator uuid; v_cover text;
begin v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
select creator_id,cover_url into v_creator,v_cover from events where id=p_event_id; if not found then raise exception 'EVENT_NOT_FOUND'; end if;
if v_creator<>v_uid then raise exception 'NOT_EVENT_OWNER'; end if;
delete from events where id=p_event_id; return jsonb_build_object('deleted',true,'event_id',p_event_id,'cover_url',v_cover); end $$;

create or replace function private.delete_group(p_group_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid; v_creator uuid; v_vip boolean; v_paths text[];
begin v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
select creator_id,is_vip into v_creator,v_vip from groups where id=p_group_id; if not found then raise exception 'GROUP_NOT_FOUND'; end if;
if v_creator<>v_uid then raise exception 'NOT_GROUP_OWNER'; end if; if v_vip then raise exception 'VIP_GROUP_CANNOT_BE_DELETED'; end if;
select coalesce(array_agg(media_path) filter(where media_path is not null),'{}'::text[]) into v_paths from group_messages where group_id=p_group_id;
delete from groups where id=p_group_id; return jsonb_build_object('deleted',true,'group_id',p_group_id,'media_paths',v_paths); end $$;

create or replace function private.delete_dating_card()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid;
begin v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
if not exists(select 1 from dating_profiles where user_id=v_uid) then raise exception 'DATING_CARD_NOT_FOUND'; end if;
delete from dating_requests where (sender_id=v_uid or recipient_id=v_uid) and status='pending';
delete from dating_profiles where user_id=v_uid;
return jsonb_build_object('deleted',true,'user_id',v_uid); end $$;

create or replace function private.delete_dm_message(p_message_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid; v_sender uuid; v_path text;
begin v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
select sender_id,media_path into v_sender,v_path from dm_messages where id=p_message_id; if not found then raise exception 'MESSAGE_NOT_FOUND'; end if;
if v_sender<>v_uid then raise exception 'NOT_MESSAGE_OWNER'; end if;
delete from notifications where data->>'message_id'=p_message_id::text; delete from dm_messages where id=p_message_id;
return jsonb_build_object('deleted',true,'message_id',p_message_id,'media_path',v_path); end $$;

create or replace function private.delete_crush_vote(p_cycle_id uuid,p_nominee_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid;
begin v_uid:=auth.uid(); if v_uid is null then raise exception 'NOT_AUTHENTICATED'; end if;
delete from crush_votes where cycle_id=p_cycle_id and nominee_id=p_nominee_id and voter_id=v_uid;
return jsonb_build_object('deleted',true,'cycle_id',p_cycle_id,'nominee_id',p_nominee_id); end $$;

create or replace function public.delete_post(p_post_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.delete_post($1) $$;
create or replace function public.delete_post_comment(p_comment_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.delete_post_comment($1) $$;
create or replace function public.delete_secret_post(p_secret_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.delete_secret_post($1) $$;
create or replace function public.delete_secret_comment(p_comment_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.delete_secret_comment($1) $$;
create or replace function public.delete_event(p_event_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.delete_event($1) $$;
create or replace function public.delete_group(p_group_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.delete_group($1) $$;
create or replace function public.delete_dating_card() returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.delete_dating_card() $$;
create or replace function public.delete_dm_message(p_message_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.delete_dm_message($1) $$;
create or replace function public.delete_crush_vote(p_cycle_id uuid,p_nominee_id uuid) returns jsonb language sql security invoker set search_path=public,pg_temp as $$ select private.delete_crush_vote($1,$2) $$;

revoke all on function private.delete_post(uuid),private.delete_post_comment(uuid),private.delete_secret_post(uuid),private.delete_secret_comment(uuid),private.delete_event(uuid),private.delete_group(uuid),private.delete_dating_card(),private.delete_dm_message(uuid),private.delete_crush_vote(uuid,uuid) from public,anon;
grant execute on function private.delete_post(uuid),private.delete_post_comment(uuid),private.delete_secret_post(uuid),private.delete_secret_comment(uuid),private.delete_event(uuid),private.delete_group(uuid),private.delete_dating_card(),private.delete_dm_message(uuid),private.delete_crush_vote(uuid,uuid) to authenticated;
revoke all on function public.delete_post(uuid),public.delete_post_comment(uuid),public.delete_secret_post(uuid),public.delete_secret_comment(uuid),public.delete_event(uuid),public.delete_group(uuid),public.delete_dating_card(),public.delete_dm_message(uuid),public.delete_crush_vote(uuid,uuid) from public,anon;
grant execute on function public.delete_post(uuid),public.delete_post_comment(uuid),public.delete_secret_post(uuid),public.delete_secret_comment(uuid),public.delete_event(uuid),public.delete_group(uuid),public.delete_dating_card(),public.delete_dm_message(uuid),public.delete_crush_vote(uuid,uuid) to authenticated;