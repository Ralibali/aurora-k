REVOKE ALL ON TABLE public.vehicle_checks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.vehicle_checks TO authenticated;
GRANT ALL ON TABLE public.vehicle_checks TO service_role;
COMMENT ON FUNCTION public.report_vehicle_check(uuid,uuid,text,text,text,boolean,text) IS 'Only assigned company drivers can submit observations. No assignment status/time changes.';