
-- AI Business Intelligence Tables
CREATE TABLE public.sales_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users NOT NULL,
  product_id UUID REFERENCES public.products,
  predicted_date DATE NOT NULL,
  predicted_quantity INTEGER NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  prediction_factors JSONB, -- weather, holidays, events, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer Credit Management
CREATE TABLE public.customer_credit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers NOT NULL,
  owner_id UUID REFERENCES auth.users NOT NULL,
  credit_limit DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  credit_score INTEGER DEFAULT 50, -- 0-100 scale
  payment_history JSONB DEFAULT '[]',
  last_payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Loyalty Programs
CREATE TABLE public.loyalty_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  points_per_tzs DECIMAL(5,2) DEFAULT 1, -- points earned per TZS spent
  reward_threshold INTEGER DEFAULT 100,
  reward_value DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.customer_loyalty_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers NOT NULL,
  owner_id UUID REFERENCES auth.users NOT NULL,
  total_points INTEGER DEFAULT 0,
  points_earned_today INTEGER DEFAULT 0,
  last_transaction_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Community Marketplace
CREATE TABLE public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users NOT NULL,
  product_name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  category TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  listing_type TEXT CHECK (listing_type IN ('sell', 'buy', 'trade', 'emergency_share')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Multi-Store Management
CREATE TABLE public.business_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  manager_id UUID REFERENCES auth.users,
  is_main_location BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID REFERENCES auth.users NOT NULL,
  location_id UUID REFERENCES public.business_locations NOT NULL,
  sales_count INTEGER DEFAULT 0,
  sales_amount DECIMAL(10,2) DEFAULT 0,
  commission_earned DECIMAL(10,2) DEFAULT 0,
  performance_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI Chat Sessions
CREATE TABLE public.ai_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  session_type TEXT CHECK (session_type IN ('business_advisor', 'pricing_help', 'inventory_help', 'general')),
  messages JSONB DEFAULT '[]',
  language TEXT DEFAULT 'sw', -- sw for Swahili, en for English
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Voice Commands Log
CREATE TABLE public.voice_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  command_text TEXT NOT NULL,
  language TEXT NOT NULL, -- 'sw' or 'en'
  action_taken TEXT,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Social Commerce
CREATE TABLE public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products NOT NULL,
  customer_id UUID REFERENCES public.customers,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.social_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users NOT NULL,
  content_type TEXT CHECK (content_type IN ('product', 'deal', 'promotion')),
  content_id UUID,
  platform TEXT CHECK (platform IN ('whatsapp', 'instagram', 'tiktok', 'facebook')),
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Smart Receipts
CREATE TABLE public.smart_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales NOT NULL,
  qr_code TEXT UNIQUE NOT NULL,
  digital_wallet_data JSONB,
  warranty_info JSONB,
  tax_category TEXT,
  customer_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business Insights Cache
CREATE TABLE public.business_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users NOT NULL,
  insight_type TEXT NOT NULL,
  insight_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all new tables
ALTER TABLE public.sales_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies (fixed syntax - separate policies for each operation)
CREATE POLICY "Users can select their sales predictions" ON public.sales_predictions
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their sales predictions" ON public.sales_predictions
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their sales predictions" ON public.sales_predictions
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their sales predictions" ON public.sales_predictions
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can select their customer credit" ON public.customer_credit
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their customer credit" ON public.customer_credit
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their customer credit" ON public.customer_credit
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their customer credit" ON public.customer_credit
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can select their loyalty programs" ON public.loyalty_programs
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their loyalty programs" ON public.loyalty_programs
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their loyalty programs" ON public.loyalty_programs
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their loyalty programs" ON public.loyalty_programs
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can select customer loyalty points" ON public.customer_loyalty_points
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert customer loyalty points" ON public.customer_loyalty_points
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update customer loyalty points" ON public.customer_loyalty_points
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete customer loyalty points" ON public.customer_loyalty_points
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view all marketplace listings" ON public.marketplace_listings
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their marketplace listings" ON public.marketplace_listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Users can update their marketplace listings" ON public.marketplace_listings
  FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Users can delete their marketplace listings" ON public.marketplace_listings
  FOR DELETE USING (auth.uid() = seller_id);

CREATE POLICY "Users can select their business locations" ON public.business_locations
  FOR SELECT USING (auth.uid() = owner_id OR auth.uid() = manager_id);
CREATE POLICY "Users can insert their business locations" ON public.business_locations
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their business locations" ON public.business_locations
  FOR UPDATE USING (auth.uid() = owner_id OR auth.uid() = manager_id);
CREATE POLICY "Users can delete their business locations" ON public.business_locations
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view relevant staff performance" ON public.staff_performance
  FOR SELECT USING (
    auth.uid() = staff_id OR 
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = location_id AND bl.owner_id = auth.uid())
  );
CREATE POLICY "Users can insert staff performance" ON public.staff_performance
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = location_id AND bl.owner_id = auth.uid())
  );
CREATE POLICY "Users can update staff performance" ON public.staff_performance
  FOR UPDATE USING (
    auth.uid() = staff_id OR 
    EXISTS (SELECT 1 FROM public.business_locations bl WHERE bl.id = location_id AND bl.owner_id = auth.uid())
  );

CREATE POLICY "Users can select their AI chat sessions" ON public.ai_chat_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their AI chat sessions" ON public.ai_chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their AI chat sessions" ON public.ai_chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their AI chat sessions" ON public.ai_chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can select their voice commands" ON public.voice_commands
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their voice commands" ON public.voice_commands
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all product reviews" ON public.product_reviews
  FOR SELECT USING (true);
CREATE POLICY "Users can insert reviews for their products" ON public.product_reviews
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid())
  );
CREATE POLICY "Users can update reviews for their products" ON public.product_reviews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid())
  );
CREATE POLICY "Users can delete reviews for their products" ON public.product_reviews
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.owner_id = auth.uid())
  );

CREATE POLICY "Users can select their social shares" ON public.social_shares
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their social shares" ON public.social_shares
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their social shares" ON public.social_shares
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their social shares" ON public.social_shares
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Users can view smart receipts for their sales" ON public.smart_receipts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "Users can insert smart receipts for their sales" ON public.smart_receipts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "Users can select their business insights" ON public.business_insights
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their business insights" ON public.business_insights
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their business insights" ON public.business_insights
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their business insights" ON public.business_insights
  FOR DELETE USING (auth.uid() = owner_id);
