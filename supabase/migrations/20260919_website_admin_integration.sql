-- 1. Add missing vehicle fields
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS hire_price NUMERIC(20, 4),
ADD COLUMN IF NOT EXISTS hire_price_weekly NUMERIC(20, 4),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS for_hire BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS chassis_no TEXT,
ADD COLUMN IF NOT EXISTS engine_no TEXT,
ADD COLUMN IF NOT EXISTS condition TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Create website_messages
CREATE TABLE IF NOT EXISTS website_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create hire_requests
CREATE TABLE IF NOT EXISTS hire_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create trade_in_requests
CREATE TABLE IF NOT EXISTS trade_in_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make_model TEXT NOT NULL,
    year INT NOT NULL,
    mileage INT NOT NULL,
    condition TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE website_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_in_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access - website_messages" ON website_messages;
DROP POLICY IF EXISTS "Service role full access - hire_requests" ON hire_requests;
DROP POLICY IF EXISTS "Service role full access - trade_in_requests" ON trade_in_requests;

CREATE POLICY "Service role full access - website_messages" ON website_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - hire_requests" ON hire_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access - trade_in_requests" ON trade_in_requests FOR ALL USING (true) WITH CHECK (true);
