
create or replace function public.get_today_puzzle()
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); c public.seven_day_activity_configs%rowtype; scheduled_slug text; day_no smallint:=extract(isodow from current_date)::smallint; pick jsonb;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select activity_slug into scheduled_slug from public.seven_day_activity_schedule where day_number=day_no and enabled=true;
 if scheduled_slug <> 'puzzle' then raise exception 'Puzzle is not scheduled for today'; end if;
 select * into c from public.seven_day_activity_configs where slug='puzzle' and is_enabled=true;
 if not found or jsonb_array_length(coalesce(c.puzzle_bank,'[]'::jsonb))=0 then raise exception 'Puzzle unavailable'; end if;
 select x into pick from jsonb_array_elements(c.puzzle_bank) x order by random() limit 1;
 return jsonb_build_object('question',pick->>'question');
end $$;

create or replace function public.play_puzzle_activity(p_answer text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); c public.seven_day_activity_configs%rowtype; a public.seven_day_activity_attempts%rowtype; scheduled_slug text; day_no smallint:=extract(isodow from current_date)::smallint; attempts_left integer; reward bigint:=0; reward_label text:='Activity complete'; correct boolean:=false; x jsonb;
begin
 if uid is null then raise exception 'Authentication required'; end if;
 select activity_slug into scheduled_slug from public.seven_day_activity_schedule where day_number=day_no and enabled=true;
 if scheduled_slug <> 'puzzle' then raise exception 'Puzzle is not scheduled for today'; end if;
 select * into c from public.seven_day_activity_configs where slug='puzzle' and is_enabled=true;
 if not found then raise exception 'Puzzle unavailable'; end if;
 insert into public.seven_day_activity_attempts(user_id,activity_slug,activity_date) values(uid,'puzzle',current_date) on conflict(user_id,activity_slug,activity_date) do nothing;
 select * into a from public.seven_day_activity_attempts where user_id=uid and activity_slug='puzzle' and activity_date=current_date for update;
 attempts_left:=greatest(0,c.free_attempts+c.extra_attempts-a.attempts_used);
 if attempts_left<=0 then raise exception 'No attempts remaining'; end if;
 if length(trim(coalesce(p_answer,'')))=0 then raise exception 'Answer required'; end if;
 for x in select * from jsonb_array_elements(coalesce(c.puzzle_bank,'[]'::jsonb)) loop
   if lower(trim(coalesce(x->>'answer','')))=lower(trim(p_answer)) then correct:=true; exit; end if;
 end loop;
 if not correct then
   update public.seven_day_activity_attempts set attempts_used=attempts_used+1,last_result=jsonb_build_object('result','incorrect'),updated_at=now() where id=a.id;
   return jsonb_build_object('result','incorrect','attempts_left',attempts_left-1);
 end if;
 update public.seven_day_activity_attempts set attempts_used=attempts_used+1,last_result=jsonb_build_object('result','completed'),updated_at=now() where id=a.id;
 select x->>'label',coalesce((x->>'amount')::bigint,0) into reward_label,reward from jsonb_array_elements(c.reward_pool) x order by random() limit 1;
 if reward<>0 then perform public.apply_bc_delta(uid,reward,'7-Day Activity: Panda Puzzle','seven_day_activity'); end if;
 update public.seven_day_activity_attempts set last_result=jsonb_build_object('result','completed','reward_bc',reward,'reward_label',reward_label),updated_at=now() where id=a.id;
 return jsonb_build_object('result','completed','reward_bc',reward,'reward_label',reward_label,'attempts_left',attempts_left-1);
end $$;
revoke execute on function public.get_today_puzzle() from public,anon;
revoke execute on function public.play_puzzle_activity(text) from public,anon;
grant execute on function public.get_today_puzzle() to authenticated;
grant execute on function public.play_puzzle_activity(text) to authenticated;

