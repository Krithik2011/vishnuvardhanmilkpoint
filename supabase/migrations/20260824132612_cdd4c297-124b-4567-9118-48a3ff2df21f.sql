REVOKE ALL ON FUNCTION public.apply_stock_delta(jsonb, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stock_delta(jsonb, integer) TO service_role;

REVOKE ALL ON FUNCTION public.record_delivery(date, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_delivery(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_stock_entry(date, text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_stock_entry(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_delivery(date, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_delivery(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_stock_entry(date, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_stock_entry(uuid) TO authenticated, service_role;