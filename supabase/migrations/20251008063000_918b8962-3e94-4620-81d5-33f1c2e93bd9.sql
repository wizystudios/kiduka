-- Create products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  description text,
  price decimal(10,2) not null,
  stock_quantity integer not null default 0,
  low_stock_threshold integer default 10,
  barcode text unique,
  category text,
  unit text default 'pcs',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create customers table
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  name text not null,
  email text,
  phone text,
  credit_limit decimal(10,2) default 0,
  outstanding_balance decimal(10,2) default 0,
  total_purchases decimal(10,2) default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create sales table
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  customer_id uuid references public.customers(id),
  total_amount decimal(10,2) not null,
  discount_amount decimal(10,2) default 0,
  payment_method text,
  payment_status text default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create sales_items table
create table if not exists public.sales_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null,
  unit_price decimal(10,2) not null,
  subtotal decimal(10,2) not null,
  created_at timestamptz not null default now()
);

-- Create marketplace_listings table
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null,
  product_name text not null,
  description text,
  quantity integer not null,
  price decimal(10,2),
  unit text default 'pcs',
  listing_type text not null check (listing_type in ('sell', 'buy', 'trade', 'emergency_share')),
  status text default 'active' check (status in ('active', 'completed', 'cancelled')),
  location text,
  contact_info jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create ai_chat_sessions table
create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  session_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create voice_commands table
create table if not exists public.voice_commands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  command_text text not null,
  command_type text,
  result jsonb,
  created_at timestamptz not null default now()
);

-- Create business_insights table
create table if not exists public.business_insights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  insight_type text not null,
  insight_data jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Create sales_predictions table
create table if not exists public.sales_predictions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  product_id uuid references public.products(id),
  predicted_quantity integer not null,
  confidence_score decimal(5,2),
  prediction_factors jsonb,
  prediction_date date not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on all tables
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sales_items enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.ai_chat_sessions enable row level security;
alter table public.voice_commands enable row level security;
alter table public.business_insights enable row level security;
alter table public.sales_predictions enable row level security;

-- Triggers for updated_at
create trigger products_set_updated_at before update on public.products
for each row execute function public.update_updated_at_column();

create trigger customers_set_updated_at before update on public.customers
for each row execute function public.update_updated_at_column();

create trigger sales_set_updated_at before update on public.sales
for each row execute function public.update_updated_at_column();

create trigger marketplace_listings_set_updated_at before update on public.marketplace_listings
for each row execute function public.update_updated_at_column();

create trigger ai_chat_sessions_set_updated_at before update on public.ai_chat_sessions
for each row execute function public.update_updated_at_column();

-- RLS Policies for products
drop policy if exists "Users can view their own products" on public.products;
create policy "Users can view their own products"
  on public.products for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert their own products" on public.products;
create policy "Users can insert their own products"
  on public.products for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update their own products" on public.products;
create policy "Users can update their own products"
  on public.products for update
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users can delete their own products" on public.products;
create policy "Users can delete their own products"
  on public.products for delete
  to authenticated
  using (auth.uid() = owner_id);

-- RLS Policies for customers
drop policy if exists "Users can view their own customers" on public.customers;
create policy "Users can view their own customers"
  on public.customers for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert their own customers" on public.customers;
create policy "Users can insert their own customers"
  on public.customers for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users can update their own customers" on public.customers;
create policy "Users can update their own customers"
  on public.customers for update
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users can delete their own customers" on public.customers;
create policy "Users can delete their own customers"
  on public.customers for delete
  to authenticated
  using (auth.uid() = owner_id);

-- RLS Policies for sales
drop policy if exists "Users can view their own sales" on public.sales;
create policy "Users can view their own sales"
  on public.sales for select
  to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "Users can insert their own sales" on public.sales;
create policy "Users can insert their own sales"
  on public.sales for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Users can view their own sales items" on public.sales_items;
create policy "Users can view their own sales items"
  on public.sales_items for select
  to authenticated
  using (exists (
    select 1 from public.sales
    where sales.id = sales_items.sale_id
    and sales.owner_id = auth.uid()
  ));

drop policy if exists "Users can insert their own sales items" on public.sales_items;
create policy "Users can insert their own sales items"
  on public.sales_items for insert
  to authenticated
  with check (exists (
    select 1 from public.sales
    where sales.id = sales_items.sale_id
    and sales.owner_id = auth.uid()
  ));

-- RLS Policies for marketplace (everyone can view)
drop policy if exists "Anyone can view marketplace listings" on public.marketplace_listings;
create policy "Anyone can view marketplace listings"
  on public.marketplace_listings for select
  to authenticated
  using (true);

drop policy if exists "Users can insert their own listings" on public.marketplace_listings;
create policy "Users can insert their own listings"
  on public.marketplace_listings for insert
  to authenticated
  with check (auth.uid() = seller_id);

drop policy if exists "Users can update their own listings" on public.marketplace_listings;
create policy "Users can update their own listings"
  on public.marketplace_listings for update
  to authenticated
  using (auth.uid() = seller_id);

drop policy if exists "Users can delete their own listings" on public.marketplace_listings;
create policy "Users can delete their own listings"
  on public.marketplace_listings for delete
  to authenticated
  using (auth.uid() = seller_id);

-- RLS Policies for AI and voice data
drop policy if exists "Users can manage their own chat sessions" on public.ai_chat_sessions;
create policy "Users can manage their own chat sessions"
  on public.ai_chat_sessions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their own voice commands" on public.voice_commands;
create policy "Users can manage their own voice commands"
  on public.voice_commands for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view their own insights" on public.business_insights;
create policy "Users can view their own insights"
  on public.business_insights for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Users can view their own predictions" on public.sales_predictions;
create policy "Users can view their own predictions"
  on public.sales_predictions for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
