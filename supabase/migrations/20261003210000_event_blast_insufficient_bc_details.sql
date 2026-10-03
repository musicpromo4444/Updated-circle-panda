-- Event Blast BC errors now include the exact required and available balances.
CREATE OR REPLACE FUNCTION public.start_event_blast_secure(
  p_event_id uuid,
  p_plan_id text,
  p_payment_method text DEFAULT 'bc',
  p_target_scope text DEFAULT 'worldwide',
  p_target_country text DEFAULT NULL,
  p_target_state text DEFAULT NULL,
  p_target_city text DEFAULT NULL,
  p_target_area text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','pg_temp'
AS $function$
declare
  uid uuid:=auth.uid(); owner uuid; plan public.event_blast_plans%rowtype; bal bigint;
  bid uuid; ends timestamptz; method text:=lower(trim(coalesce(p_payment_method,'bc')));
  scope text:=coalesce(p_target_scope,'worldwide');
begin
  if uid is null then raise exception 'Unauthorized'; end if;
  if method not in ('bc','cash') then raise exception 'Invalid payment method'; end if;
  if scope not in ('worldwide','country','state','city','area') then raise exception 'Invalid Blast target'; end if;
  if scope<>'worldwide' and nullif(trim(coalesce(p_target_country,'')),'') is null then raise exception 'Target country is required'; end if;
  if scope in ('state','city','area') and nullif(trim(case when scope='state' then coalesce(p_target_state,'') when scope='city' then coalesce(p_target_city,'') else coalesce(p_target_area,'') end),'') is null then raise exception 'Target location is required'; end if;
  select owner_id into owner from public.events where id=p_event_id and is_published=true;
  if owner is null then raise exception 'Event not found'; end if;
  if owner<>uid then raise exception 'Only the event owner can start a blast'; end if;
  select * into plan from public.event_blast_plans where id=p_plan_id and enabled=true;
  if not found then raise exception 'Event Blast plan not found'; end if;
  if method='bc' then
    if plan.bc_price is null then raise exception 'No equivalent BC price for this Event Blast plan'; end if;
    select balance into bal from public.bc_accounts where user_id=uid for update;
    bal:=coalesce(bal,0);
    if bal<coalesce(plan.bc_price,0) then raise exception 'Insufficient BC. Required: % BC. Balance: % BC.', plan.bc_price, bal; end if;
    update public.bc_accounts set balance=balance-plan.bc_price,updated_at=now() where user_id=uid;
  else
    raise exception 'Cash checkout must be verified before the blast is activated';
  end if;
  ends:=now()+make_interval(mins=>plan.duration_minutes);
  insert into public.event_blasts(event_id,purchaser_id,bc_cost,status,started_at,ends_at,plan_id,reach_target,payment_method,price_usd,unique_reach,notification_capacity,bonus_percent,notification_target,notification_sent,target_scope,target_country,target_state,target_city,target_area)
  values(p_event_id,uid,coalesce(plan.bc_price,0),'active',now(),ends,plan.id,plan.unique_reach,method,plan.price_usd,plan.unique_reach,ceil(plan.unique_reach*1.20),20,ceil(plan.unique_reach*1.20),0,scope,nullif(trim(p_target_country),''),nullif(trim(p_target_state),''),nullif(trim(p_target_city),''),nullif(trim(p_target_area),'')) returning id into bid;
  if method='bc' then insert into public.bc_ledger(user_id,amount,reason,reference_type,reference_id) values(uid,-plan.bc_price,'Event Blast','event_blast',bid); end if;
  perform private.dispatch_event_blast_notifications(bid);
  return jsonb_build_object('id',bid,'plan_id',plan.id,'unique_reach',plan.unique_reach,'bonus_percent',20,'notification_capacity',ceil(plan.unique_reach*1.20),'target_scope',scope,'target_country',p_target_country,'ends_at',ends,'bc_cost',coalesce(plan.bc_price,0));
end
$function$;
