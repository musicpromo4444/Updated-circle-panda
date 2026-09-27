-- Secret Reveal uses one sponsored gate before the real puzzle; solving then shows YES/NO directly.
CREATE OR REPLACE FUNCTION public.play_secret_reveal(p_action text DEFAULT 'start'::text, p_words jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare uid uuid:=auth.uid(); a public.seven_day_activity_attempts%rowtype; c public.seven_day_activity_configs%rowtype; confession public.confessions%rowtype; attempts_left integer; words jsonb; supplied text; expected text; reward bigint:=0; reward_label text:='Secret Reveal';
begin
if uid is null then raise exception 'Authentication required'; end if;
select * into c from public.seven_day_activity_configs where slug='secret_reveal' and is_enabled=true;
if not found then raise exception 'Secret Reveal unavailable'; end if;
insert into public.seven_day_activity_attempts(user_id,activity_slug,activity_date) values(uid,'secret_reveal',current_date) on conflict(user_id,activity_slug,activity_date) do nothing;
select * into a from public.seven_day_activity_attempts where user_id=uid and activity_slug='secret_reveal' and activity_date=current_date for update;
attempts_left:=greatest(0,c.free_attempts+a.extra_attempts-a.attempts_used);
if p_action='start' then
 if attempts_left<=0 then raise exception 'No attempts remaining'; end if;
 select * into confession from public.confessions where not is_hidden and length(trim(body)) between 10 and 5000 order by random() limit 1;
 if not found then raise exception 'No Secret Confession is available for this activity yet'; end if;
 words:=to_jsonb(regexp_split_to_array(trim(confession.body),'[[:space:]]+'));
 if jsonb_array_length(words)>14 then words:=(select jsonb_agg(value) from jsonb_array_elements(words) with ordinality t(value,n) where n<=14); end if;
 update public.seven_day_activity_attempts set attempts_used=attempts_used+1,last_result=jsonb_build_object('result','puzzle_ready','secret_id',confession.id,'words',words),updated_at=now() where id=a.id;
 return jsonb_build_object('result','puzzle_ready','secret_id',confession.id,'pieces',(select jsonb_agg(value order by random()) from jsonb_array_elements(words)),'attempts_left',attempts_left-1);
end if;
if p_action='solve' then
 if coalesce(a.last_result->>'result','')<>'puzzle_ready' then raise exception 'Start the Secret Reveal puzzle first'; end if;
 expected:=lower(array_to_string(array(select jsonb_array_elements_text(a.last_result->'words')),' '));
 supplied:=lower(trim(array_to_string(array(select jsonb_array_elements_text(p_words)),' ')));
 if supplied<>expected then
  update public.seven_day_activity_attempts set last_result=jsonb_build_object('result','failed','reward_bc',0,'reward_label','Try Again'),updated_at=now() where id=a.id;
  return jsonb_build_object('result','failed','reward_bc',0,'reward_label','Try Again','detail','The confession pieces are not in the right order.','attempts_left',attempts_left,'ad_required',true);
 end if;
 select x->>'label',coalesce((x->>'amount')::bigint,0) into reward_label,reward from jsonb_array_elements(c.reward_pool) x order by random() limit 1;
 if reward<>0 then perform public.apply_bc_delta(uid,reward,'7-Day Activity: Secret Reveal','seven_day_activity'); end if;
 update public.seven_day_activity_attempts set last_result=jsonb_build_object('result','solved','secret_id',(a.last_result->>'secret_id')::uuid,'reward_bc',reward,'reward_label',reward_label),updated_at=now() where id=a.id;
 return jsonb_build_object('result','solved','secret_id',(a.last_result->>'secret_id')::uuid,'reward_bc',reward,'reward_label',reward_label,'detail','Secret puzzle solved. Choose YES or NO after the sponsored reveal.' ,'attempts_left',attempts_left);
end if;
if p_action='choice' then
 if coalesce(a.last_result->>'result','')<>'solved' then raise exception 'Solve the Secret Reveal first'; end if;
 if lower(coalesce(p_words->>0,'')) not in ('yes','no') then raise exception 'Invalid choice'; end if;
 select body into supplied from public.confessions where id=(a.last_result->>'secret_id')::uuid and not is_hidden;
 if supplied is null then raise exception 'Secret Confession is no longer available'; end if;
 return jsonb_build_object('result','completed','choice',lower(p_words->>0),'secret',case when lower(p_words->>0)='yes' then supplied else null end,'reward_bc',coalesce((a.last_result->>'reward_bc')::bigint,0),'reward_label',coalesce(a.last_result->>'reward_label','Secret Reveal'),'attempts_left',attempts_left);
end if;
raise exception 'Invalid Secret Reveal action';
end; $function$

