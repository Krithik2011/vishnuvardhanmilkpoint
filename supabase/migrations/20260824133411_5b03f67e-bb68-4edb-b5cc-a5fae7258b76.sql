CREATE OR REPLACE FUNCTION public.apply_stock_delta(p_items jsonb, p_sign integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  it jsonb;
  pid uuid;
  q numeric;
  cur numeric;
  pname text;
BEGIN
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    pid := (it->>'productId')::uuid;
    q := COALESCE((it->>'qty')::numeric, 0) * p_sign;

    SELECT stock, name INTO cur, pname FROM public.products WHERE id = pid FOR UPDATE;
    IF pname IS NULL THEN
      RAISE EXCEPTION 'Product not found';
    END IF;
    IF cur + q < 0 THEN
      RAISE EXCEPTION 'Not enough stock for %. Only % left. Please record stock received first.', pname, cur;
    END IF;

    UPDATE public.products SET stock = cur + q WHERE id = pid;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_stock_delta(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stock_delta(jsonb, integer) TO service_role;