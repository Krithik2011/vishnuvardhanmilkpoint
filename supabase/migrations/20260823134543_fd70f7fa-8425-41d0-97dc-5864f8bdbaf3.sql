
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT '',
  buy_price numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  low_stock_at numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.stock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT current_date,
  supplier text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT current_date,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT current_date,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'Cash',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.stock_entries TO service_role;
GRANT ALL ON public.deliveries TO service_role;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff manage customers" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff manage products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff manage stock_entries" ON public.stock_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff manage deliveries" ON public.deliveries FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "staff manage payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- atomic stock movements
CREATE OR REPLACE FUNCTION public.apply_stock_delta(p_items jsonb, p_sign int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it jsonb;
  pid uuid;
  q numeric;
  newstock numeric;
  pname text;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    pid := (it->>'productId')::uuid;
    q := COALESCE((it->>'qty')::numeric, 0) * p_sign;
    UPDATE public.products SET stock = stock + q WHERE id = pid
      RETURNING stock, name INTO newstock, pname;
    IF pname IS NULL THEN
      RAISE EXCEPTION 'Product not found';
    END IF;
    IF newstock < 0 THEN
      RAISE EXCEPTION 'Not enough stock for %. Please record stock received first.', pname;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_delivery(p_date date, p_customer uuid, p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  PERFORM public.apply_stock_delta(p_items, -1);
  INSERT INTO public.deliveries(date, customer_id, items) VALUES (p_date, p_customer, p_items)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_delivery(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE it jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  SELECT items INTO it FROM public.deliveries WHERE id = p_id FOR UPDATE;
  IF it IS NULL THEN RETURN; END IF;
  PERFORM public.apply_stock_delta(it, 1);
  DELETE FROM public.deliveries WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_stock_entry(p_date date, p_supplier text, p_items jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  PERFORM public.apply_stock_delta(p_items, 1);
  INSERT INTO public.stock_entries(date, supplier, items) VALUES (p_date, p_supplier, p_items)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_stock_entry(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE it jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in'; END IF;
  SELECT items INTO it FROM public.stock_entries WHERE id = p_id FOR UPDATE;
  IF it IS NULL THEN RETURN; END IF;
  PERFORM public.apply_stock_delta(it, -1);
  DELETE FROM public.stock_entries WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stock_delta(jsonb, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_delivery(date, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_delivery(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_stock_entry(date, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_stock_entry(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliveries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER TABLE public.products REPLICA IDENTITY FULL;
ALTER TABLE public.deliveries REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.stock_entries REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.suppliers REPLICA IDENTITY FULL;

-- seed demo data
INSERT INTO public.suppliers (id, name, phone, note) VALUES
 ('11111111-1111-4111-8111-000000000001','Amul','1800 258 3333','Depot pickup at 5:00 AM'),
 ('11111111-1111-4111-8111-000000000002','Vijaya (Telangana)','040 2331 2233','Govt. dairy agency'),
 ('11111111-1111-4111-8111-000000000003','Heritage','98480 55667','Delivered to shop'),
 ('11111111-1111-4111-8111-000000000004','Dodla','90300 12345',NULL);

INSERT INTO public.products (id, supplier_id, name, unit, buy_price, sale_price, stock, low_stock_at) VALUES
 ('22222222-2222-4222-8222-000000000001','11111111-1111-4111-8111-000000000001','Taaza Toned Milk','500 ml packet',25,28,120,40),
 ('22222222-2222-4222-8222-000000000002','11111111-1111-4111-8111-000000000001','Gold Full Cream Milk','500 ml packet',32,35,18,30),
 ('22222222-2222-4222-8222-000000000003','11111111-1111-4111-8111-000000000001','Butter','100 g',54,60,24,10),
 ('22222222-2222-4222-8222-000000000004','11111111-1111-4111-8111-000000000002','Toned Milk','500 ml packet',23,26,200,50),
 ('22222222-2222-4222-8222-000000000005','11111111-1111-4111-8111-000000000002','Curd','500 g cup',28,32,12,20),
 ('22222222-2222-4222-8222-000000000006','11111111-1111-4111-8111-000000000003','Cow Milk','500 ml packet',26,30,90,40),
 ('22222222-2222-4222-8222-000000000007','11111111-1111-4111-8111-000000000003','Paneer','200 g',88,100,8,6),
 ('22222222-2222-4222-8222-000000000008','11111111-1111-4111-8111-000000000004','Buttermilk','200 ml pouch',8,10,150,50);

INSERT INTO public.customers (id, name, phone, address, note) VALUES
 ('33333333-3333-4333-8333-000000000001','Ramesh Kirana Store','98490 11223','Shop 4, Ameerpet Main Road','Morning route'),
 ('33333333-3333-4333-8333-000000000002','Lakshmi Tiffin Centre','99590 44556','Beside Bus Stand, Kukatpally',NULL),
 ('33333333-3333-4333-8333-000000000003','Srinivas Reddy (Home)','90000 77889','Flat 302, Sai Enclave, Miyapur',NULL),
 ('33333333-3333-4333-8333-000000000004','Sai Provisions','97010 33445','Nizampet X Roads',NULL),
 ('33333333-3333-4333-8333-000000000005','Anitha Hotel','88860 99001','Old Bowenpally Market',NULL);

INSERT INTO public.stock_entries (date, supplier, items) VALUES
 (current_date - 2,'Amul Depot','[{"productId":"22222222-2222-4222-8222-000000000001","qty":100,"cost":25},{"productId":"22222222-2222-4222-8222-000000000002","qty":40,"cost":32}]'::jsonb),
 (current_date - 1,'Vijaya Dairy Agency','[{"productId":"22222222-2222-4222-8222-000000000004","qty":150,"cost":23},{"productId":"22222222-2222-4222-8222-000000000005","qty":30,"cost":28}]'::jsonb),
 (current_date,'Heritage Distributor','[{"productId":"22222222-2222-4222-8222-000000000006","qty":80,"cost":26},{"productId":"22222222-2222-4222-8222-000000000007","qty":10,"cost":88}]'::jsonb);

INSERT INTO public.deliveries (date, customer_id, items) VALUES
 (current_date - 3,'33333333-3333-4333-8333-000000000001','[{"productId":"22222222-2222-4222-8222-000000000001","qty":30,"price":28},{"productId":"22222222-2222-4222-8222-000000000004","qty":20,"price":26}]'::jsonb),
 (current_date - 2,'33333333-3333-4333-8333-000000000002','[{"productId":"22222222-2222-4222-8222-000000000005","qty":10,"price":32},{"productId":"22222222-2222-4222-8222-000000000008","qty":25,"price":10}]'::jsonb),
 (current_date - 1,'33333333-3333-4333-8333-000000000003','[{"productId":"22222222-2222-4222-8222-000000000006","qty":6,"price":30}]'::jsonb),
 (current_date - 1,'33333333-3333-4333-8333-000000000004','[{"productId":"22222222-2222-4222-8222-000000000001","qty":40,"price":28},{"productId":"22222222-2222-4222-8222-000000000003","qty":5,"price":60}]'::jsonb),
 (current_date,'33333333-3333-4333-8333-000000000001','[{"productId":"22222222-2222-4222-8222-000000000001","qty":25,"price":28}]'::jsonb),
 (current_date,'33333333-3333-4333-8333-000000000005','[{"productId":"22222222-2222-4222-8222-000000000004","qty":30,"price":26},{"productId":"22222222-2222-4222-8222-000000000007","qty":2,"price":100}]'::jsonb);

INSERT INTO public.payments (date, customer_id, amount, mode) VALUES
 (current_date - 2,'33333333-3333-4333-8333-000000000001',1000,'UPI'),
 (current_date - 1,'33333333-3333-4333-8333-000000000002',570,'Cash'),
 (current_date,'33333333-3333-4333-8333-000000000004',800,'Cash');
