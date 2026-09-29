insert into public.admin_permission_catalog(permission_key,label,category,description,sensitive,sort_order) values
('system.control','Control global app settings','System','Enable or disable major app features and global operational switches.',true,15),
('security.audit','View security & admin audit','Security','Review privileged actions and security history.',true,115)
on conflict(permission_key) do update set label=excluded.label,category=excluded.category,description=excluded.description,sensitive=excluded.sensitive,sort_order=excluded.sort_order;
update public.admin_rpc_permission_map set permission_key='admin.manage' where function_name in ('admin_list_users','admin_get_admin_users','admin_get_admin_permissions','admin_get_permission_catalog');
update public.admin_rpc_permission_map set permission_key='analytics.view' where function_name='admin_get_dashboard_overview';
update public.admin_rpc_permission_map set permission_key='security.audit' where function_name='admin_get_recent_audit';
update public.admin_rpc_permission_map set permission_key='system.control' where function_name in ('admin_get_app_control_center','admin_save_app_control_center');
update public.admin_rpc_permission_map set permission_key='security.api_keys' where function_name in ('admin_get_integrations','admin_upsert_integration','admin_get_hot_seat_provider_settings');
update public.admin_rpc_permission_map set permission_key='finance.payments' where function_name like 'admin_%payment%';
update public.admin_rpc_permission_map set permission_key='finance.billing' where function_name like 'admin_%bc%' or function_name like 'admin_%billing%' or function_name like 'admin_%store%';