CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    amount numeric NOT NULL,
    category text NOT NULL,
    description text,
    expense_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read access" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow admin full access" ON public.expenses FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE public.users.id = auth.uid() AND public.users.role = 'ADMIN')
);