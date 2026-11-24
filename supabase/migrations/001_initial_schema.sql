-- SASA STORE | OMOR (عُمْر) — Initial PostgreSQL Schema for Supabase
-- Includes all 23 core tables with Primary Keys, Foreign Keys, Indexes, Constraints, and Triggers.

create extension if not exists "pgcrypto";

-- 1. profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null unique,
  phone text,
  city text,
  governorate text,
  avatar_url text,
  account_status text not null default 'active' check (account_status in ('active', 'suspended', 'deleted')),
  privacy_hide_phone boolean not null default true,
  privacy_hide_city boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. user_roles
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'technician', 'store', 'admin')),
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
create index if not exists idx_user_roles_user on public.user_roles(user_id);

-- 3. categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ar text not null,
  name_en text not null,
  icon_name text not null default 'Smartphone',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 4. devices (NEVER uses IMEI as primary key; uses UUID + non-repeatable internal device_code)
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_code text not null unique,
  public_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_slug text not null references public.categories(slug),
  brand text not null,
  device_name text not null,
  model text not null,
  model_number text,
  purchase_date date,
  condition text not null default 'good' check (condition in ('new', 'like_new', 'good', 'fair', 'needs_repair')),
  status text not null default 'active' check (status in ('active', 'in_repair', 'listed_for_sale', 'transferred', 'archived')),
  image_url text,
  verification_tier text not null default 'self_recorded' check (verification_tier in ('self_recorded', 'invoice_attached', 'technician_verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_devices_owner on public.devices(owner_id);
create index if not exists idx_devices_public_token on public.devices(public_token);
create index if not exists idx_devices_code on public.devices(device_code);

-- 5. device_private_data (Strictly isolated from public QR/links)
create table if not exists public.device_private_data (
  device_id uuid primary key references public.devices(id) on delete cascade,
  serial_number text,
  imei text check (imei is null or imei ~ '^[0-9]{15}$'),
  seller_name text,
  invoice_url text,
  private_notes text,
  updated_at timestamptz not null default now()
);

-- 6. device_public_profiles (Owner-controlled QR & public link exposure)
create table if not exists public.device_public_profiles (
  device_id uuid primary key references public.devices(id) on delete cascade,
  is_public boolean not null default true,
  show_repairs boolean not null default true,
  show_warranty boolean not null default true,
  show_condition boolean not null default true,
  show_masked_serial boolean not null default false,
  updated_at timestamptz not null default now()
);

-- 7. device_events (Device Lifecycle Timeline)
create table if not exists public.device_events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null unique,
  device_id uuid not null references public.devices(id) on delete cascade,
  event_type text not null check (event_type in (
    'registered', 'invoice_added', 'warranty_started', 'warranty_expired',
    'inspected', 'repaired', 'part_replaced', 'condition_changed',
    'ownership_transferred', 'listed_for_sale', 'sale_completed',
    'note_added', 'record_corrected'
  )),
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id),
  actor_label text not null,
  description text not null,
  attachments jsonb not null default '[]'::jsonb,
  verification_status text not null default 'pending' check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  owner_approved boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_device_events_device_time on public.device_events(device_id, occurred_at desc);

-- 8. repair_centers
create table if not exists public.repair_centers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  center_name text not null,
  governorate text not null,
  district text not null,
  address_public text,
  working_hours text,
  logo_url text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

-- 9. technicians
create table if not exists public.technicians (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  center_id uuid references public.repair_centers(id) on delete set null,
  display_name text not null,
  bio text,
  specialties text[] not null default '{}',
  supported_device_types text[] not null default '{}',
  governorate text not null,
  district text not null,
  public_contact text,
  working_hours text,
  avatar_url text,
  is_verified boolean not null default false,
  verified_repairs_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_technicians_gov on public.technicians(governorate);

-- 10. repair_requests
create table if not exists public.repair_requests (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  technician_id uuid not null references public.technicians(id) on delete cascade,
  issue_type text not null,
  fault_description text not null,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in (
    'new', 'under_inspection', 'awaiting_customer_approval',
    'in_repair', 'repaired', 'delivered', 'rejected', 'cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_repair_requests_tech on public.repair_requests(technician_id);
create index if not exists idx_repair_requests_owner on public.repair_requests(owner_id);

-- 11. repair_records (Immutable once owner_approved = true; edits must create a correction record)
create table if not exists public.repair_records (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.repair_requests(id) on delete set null,
  device_id uuid not null references public.devices(id) on delete cascade,
  technician_id uuid not null references public.technicians(id),
  center_name text not null,
  issue_type text not null,
  fault_description text not null,
  diagnosis text not null,
  action_taken text not null,
  repair_cost numeric(12, 2),
  intake_date date not null,
  delivery_date date,
  warranty_days int not null default 0 check (warranty_days >= 0),
  before_images jsonb not null default '[]'::jsonb,
  after_images jsonb not null default '[]'::jsonb,
  notes text,
  status text not null default 'awaiting_customer_approval' check (status in (
    'new', 'under_inspection', 'awaiting_customer_approval',
    'in_repair', 'repaired', 'delivered', 'rejected', 'cancelled'
  )),
  owner_approved boolean not null default false,
  owner_approved_at timestamptz,
  parent_record_id uuid references public.repair_records(id),
  correction_reason text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_repair_records_device on public.repair_records(device_id);

-- Prevent silent modification of approved repair records
create or replace function public.prevent_approved_repair_mutation()
returns trigger as $$
begin
  if old.owner_approved = true then
    raise exception 'Approved repair records are immutable. Create a linked correction record instead.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_immutable_approved_repair on public.repair_records;
create trigger trg_immutable_approved_repair
  before update or delete on public.repair_records
  for each row execute function public.prevent_approved_repair_mutation();

-- 12. repair_parts
create table if not exists public.repair_parts (
  id uuid primary key default gen_random_uuid(),
  repair_record_id uuid not null references public.repair_records(id) on delete cascade,
  part_name text not null,
  part_origin text not null check (part_origin in ('new', 'used', 'unknown')),
  warranty_days int not null default 0
);

-- 13. warranties
create table if not exists public.warranties (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item_or_part_name text not null,
  issuer_name text not null,
  is_source_verified boolean not null default false,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  terms text,
  warranty_number text,
  document_url text,
  status text not null default 'active' check (status in ('active', 'expiring_soon', 'expired', 'cancelled', 'uncertain')),
  created_at timestamptz not null default now()
);
create index if not exists idx_warranties_device on public.warranties(device_id);

-- 14. ownership_transfers
create table if not exists public.ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id),
  to_user_id uuid references public.profiles(id),
  transfer_code_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'buyer_accepted', 'completed', 'cancelled', 'expired', 'disputed')),
  dispute_reason text,
  created_at timestamptz not null default now()
);
create index if not exists idx_transfers_device on public.ownership_transfers(device_id);

-- 15. technician_reviews (Only verified repair customers can review)
create table if not exists public.technician_reviews (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.technicians(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  repair_record_id uuid not null references public.repair_records(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null,
  is_reported boolean not null default false,
  created_at timestamptz not null default now(),
  unique(repair_record_id, reviewer_id)
);

-- 16. marketplace_listings
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  seller_type text not null default 'user' check (seller_type in ('user', 'store')),
  title text not null,
  price numeric(12, 2) not null check (price > 0),
  currency text not null default 'EGP',
  city text not null,
  condition text not null,
  description text not null,
  store_warranty_days int not null default 0,
  status text not null default 'active' check (status in ('active', 'reserved', 'sold', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_listings_city_status on public.marketplace_listings(city, status);

-- 17. listing_images
create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0
);

-- 18. conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.marketplace_listings(id) on delete set null,
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(listing_id, participant_a, participant_b)
);

-- 19. messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conv on public.messages(conversation_id, created_at);

-- 20. notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link_path text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

-- 21. reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  report_code text not null unique,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('listing', 'device', 'repair_record', 'technician', 'user', 'review')),
  target_id uuid not null,
  reason text not null check (reason in ('suspicious_listing', 'incorrect_device_data', 'questionable_repair', 'uncommitted_technician', 'fake_account', 'fraud_attempt', 'privacy_issue', 'other')),
  description text not null,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new', 'under_review', 'needs_info', 'resolved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- 22. audit_logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_time on public.audit_logs(created_at desc);

-- 23. platform_settings
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

-- Seed default categories
insert into public.categories (slug, name_ar, name_en, icon_name, sort_order) values
  ('smartphone', 'هاتف ذكي', 'Smartphone', 'Smartphone', 1),
  ('tablet', 'تابلت', 'Tablet', 'Tablet', 2),
  ('laptop', 'لابتوب', 'Laptop', 'Laptop', 3),
  ('desktop', 'كمبيوتر مكتبي', 'Desktop PC', 'Monitor', 4),
  ('smartwatch', 'ساعة ذكية', 'Smartwatch', 'Watch', 5),
  ('tv', 'تلفزيون وشاشات', 'TV & Display', 'Tv', 6),
  ('home_appliance', 'جهاز منزلي ذكي', 'Home Appliance', 'Cpu', 7),
  ('other', 'أجهزة إلكترونية أخرى', 'Other Electronics', 'HardDrive', 8)
on conflict (slug) do nothing;
