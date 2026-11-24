-- SASA STORE | OMOR (عُمْر) — Row Level Security (RLS) & Storage Policies

create or replace function public.has_role(target_user uuid, target_role text)
returns boolean as $$
  select exists (
    select 1 from public.user_roles
    where user_id = target_user and role = target_role
  );
$$ language sql security definer stable;

create or replace function public.is_admin()
returns boolean as $$
  select public.has_role(auth.uid(), 'admin');
$$ language sql security definer stable;

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.devices enable row level security;
alter table public.device_private_data enable row level security;
alter table public.device_public_profiles enable row level security;
alter table public.device_events enable row level security;
alter table public.repair_centers enable row level security;
alter table public.technicians enable row level security;
alter table public.repair_requests enable row level security;
alter table public.repair_records enable row level security;
alter table public.repair_parts enable row level security;
alter table public.warranties enable row level security;
alter table public.ownership_transfers enable row level security;
alter table public.technician_reviews enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.audit_logs enable row level security;
alter table public.platform_settings enable row level security;

-- Profiles: users read/update their own profile; admins manage all
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- User roles: read own or admin; only admin modifies
create policy "roles_select_own_or_admin" on public.user_roles
  for select using (user_id = auth.uid() or public.is_admin());
create policy "roles_admin_all" on public.user_roles
  for all using (public.is_admin());

-- Categories: readable by everyone; admin writes
create policy "categories_public_read" on public.categories
  for select using (true);
create policy "categories_admin_write" on public.categories
  for all using (public.is_admin());

-- Devices: owner manages own devices; public read ONLY if public profile enabled; admin all
create policy "devices_owner_all" on public.devices
  for all using (owner_id = auth.uid() or public.is_admin());
create policy "devices_public_qr_read" on public.devices
  for select using (
    exists (
      select 1 from public.device_public_profiles p
      where p.device_id = devices.id and p.is_public = true
    )
  );

-- Device private data (IMEI, Serial, Invoices): STRICTLY owner or admin only
create policy "device_private_owner_only" on public.device_private_data
  for all using (
    exists (
      select 1 from public.devices d
      where d.id = device_private_data.device_id and d.owner_id = auth.uid()
    ) or public.is_admin()
  );

-- Device public profiles: owner writes; public reads when is_public = true
create policy "public_profiles_read" on public.device_public_profiles
  for select using (
    is_public = true or exists (
      select 1 from public.devices d where d.id = device_public_profiles.device_id and d.owner_id = auth.uid()
    ) or public.is_admin()
  );
create policy "public_profiles_owner_write" on public.device_public_profiles
  for all using (
    exists (
      select 1 from public.devices d where d.id = device_public_profiles.device_id and d.owner_id = auth.uid()
    )
  );

-- Device events: owner reads/writes; public reads ONLY owner-approved events if public profile allows
create policy "events_owner_all" on public.device_events
  for all using (
    exists (select 1 from public.devices d where d.id = device_events.device_id and d.owner_id = auth.uid())
    or public.is_admin()
  );
create policy "events_public_read" on public.device_events
  for select using (
    owner_approved = true and exists (
      select 1 from public.device_public_profiles p
      where p.device_id = device_events.device_id and p.is_public = true and p.show_repairs = true
    )
  );

-- Technicians & repair centers: public directory read; self or admin write
create policy "technicians_public_read" on public.technicians for select using (true);
create policy "technicians_self_write" on public.technicians
  for all using (user_id = auth.uid() or public.is_admin());
create policy "centers_public_read" on public.repair_centers for select using (true);
create policy "centers_owner_write" on public.repair_centers
  for all using (owner_user_id = auth.uid() or public.is_admin());

-- Repair requests & records: scoped strictly to device owner, assigned technician, or admin
create policy "repair_req_scoped" on public.repair_requests
  for all using (
    owner_id = auth.uid()
    or exists (select 1 from public.technicians t where t.id = repair_requests.technician_id and t.user_id = auth.uid())
    or public.is_admin()
  );

create policy "repair_rec_scoped" on public.repair_records
  for select using (
    created_by = auth.uid()
    or exists (select 1 from public.devices d where d.id = repair_records.device_id and d.owner_id = auth.uid())
    or exists (select 1 from public.technicians t where t.id = repair_records.technician_id and t.user_id = auth.uid())
    or (owner_approved = true and exists (
      select 1 from public.device_public_profiles p where p.device_id = repair_records.device_id and p.is_public = true and p.show_repairs = true
    ))
    or public.is_admin()
  );
create policy "repair_rec_insert_tech" on public.repair_records
  for insert with check (
    exists (select 1 from public.technicians t where t.id = repair_records.technician_id and t.user_id = auth.uid())
    or public.is_admin()
  );

-- Warranties: owner or admin; public if show_warranty = true
create policy "warranties_owner_all" on public.warranties
  for all using (owner_id = auth.uid() or public.is_admin());
create policy "warranties_public_read" on public.warranties
  for select using (
    exists (
      select 1 from public.device_public_profiles p
      where p.device_id = warranties.device_id and p.is_public = true and p.show_warranty = true
    )
  );

-- Ownership transfers: sender, recipient, or admin only
create policy "transfers_scoped" on public.ownership_transfers
  for all using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());

-- Technician reviews: public read; insert ONLY if reviewer has an owner-approved repair record with that technician
create policy "reviews_public_read" on public.technician_reviews for select using (true);
create policy "reviews_verified_customer_insert" on public.technician_reviews
  for insert with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.repair_records rr
      join public.devices d on d.id = rr.device_id
      where rr.id = technician_reviews.repair_record_id
        and rr.technician_id = technician_reviews.technician_id
        and rr.owner_approved = true
        and d.owner_id = auth.uid()
    )
  );

-- Marketplace listings: active listings public; seller manages own
create policy "listings_public_read" on public.marketplace_listings
  for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());
create policy "listings_seller_write" on public.marketplace_listings
  for all using (seller_id = auth.uid() or public.is_admin());

create policy "listing_images_read" on public.listing_images for select using (true);
create policy "listing_images_seller_write" on public.listing_images
  for all using (
    exists (select 1 from public.marketplace_listings ml where ml.id = listing_images.listing_id and ml.seller_id = auth.uid())
  );

-- Conversations & messages: participants only
create policy "conversations_participants" on public.conversations
  for all using (participant_a = auth.uid() or participant_b = auth.uid() or public.is_admin());
create policy "messages_participants" on public.messages
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    ) or public.is_admin()
  );

-- Notifications: owner only
create policy "notifications_owner" on public.notifications
  for all using (user_id = auth.uid() or public.is_admin());

-- Reports: reporter reads own; admin reviews all
create policy "reports_reporter_insert" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_select_own_or_admin" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_admin_update" on public.reports
  for update using (public.is_admin());

-- Audit logs & settings: Admin only
create policy "audit_logs_admin_only" on public.audit_logs
  for all using (public.is_admin());
create policy "platform_settings_admin_only" on public.platform_settings
  for all using (public.is_admin());
