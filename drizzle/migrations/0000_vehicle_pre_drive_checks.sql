CREATE TABLE public.vehicle_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 company_id uuid NOT NULL REFERENCES public.companies(id),
 vehicle_id uuid NOT NULL REFERENCES public.vehicles(id),
 assignment_id uuid NOT NULL REFERENCES public.assignments(id),
 reported_by uuid NOT NULL REFERENCES public.profiles(id),
 tires text NOT NULL CHECK (tires IN ('no_issue','issue','not_checked')),
 lights text NOT NULL CHECK (lights IN ('no_issue','issue','not_checked')),
 damage text NOT NULL CHECK (damage IN ('no_issue','issue','not_checked')),
 safety_critical boolean NOT NULL DEFAULT false,
 note text NOT NULL DEFAULT '' CHECK (length(note) <= 3000),
 status text NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','open','resolved')),
 created_at timestamptz NOT NULL DEFAULT now(),
 resolution text,
 resolved_by uuid REFERENCES public.profiles(id),
 resolved_at timestamptz,
 CHECK ((status = 'resolved' AND resolution IS NOT NULL AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL) OR (status <> 'resolved' AND resolution IS NULL AND resolved_by IS NULL AND resolved_at IS NULL))
);
GRANT SELECT ON public.vehicle_checks TO authenticated;
GRANT ALL ON public.vehicle_checks TO service_role;
ALTER TABLE public.vehicle_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicle_checks_read ON public.vehicle_checks FOR SELECT TO authenticated USING (
 company_id = public.get_my_company_id() AND (
 public.has_role(auth.uid(), 'admin'::public.app_role) OR
 (reported_by = auth.uid() AND public.has_role(auth.uid(), 'driver'::public.app_role))
 ));
CREATE INDEX vehicle_checks_company_vehicle_date ON public.vehicle_checks(company_id, vehicle_id, created_at DESC);
CREATE INDEX vehicle_checks_open ON public.vehicle_checks(company_id, created_at DESC) WHERE status = 'open';

CREATE FUNCTION public.report_vehicle_check(p_operation_id uuid, p_assignment_id uuid, p_tires text, p_lights text, p_damage text, p_safety_critical boolean, p_note text DEFAULT '')
RETURNS public.vehicle_checks LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_uid uuid := auth.uid(); v_assignment public.assignments; v_check public.vehicle_checks; v_note text := btrim(coalesce(p_note,'')); v_issue boolean;
BEGIN
 IF v_uid IS NULL OR p_operation_id IS NULL THEN RAISE EXCEPTION 'Logga in och öppna kontrollen igen' USING ERRCODE='42501'; END IF;
 IF p_tires IS NULL OR p_lights IS NULL OR p_damage IS NULL OR p_safety_critical IS NULL OR
    p_tires NOT IN ('no_issue','issue','not_checked') OR p_lights NOT IN ('no_issue','issue','not_checked') OR p_damage NOT IN ('no_issue','issue','not_checked') OR length(v_note)>3000 THEN
   RAISE EXCEPTION 'Kontrollera svaren och beskrivningen'; END IF;
 v_issue := p_safety_critical OR p_tires='issue' OR p_lights='issue' OR p_damage='issue';
 IF v_issue AND length(v_note)=0 THEN RAISE EXCEPTION 'Beskriv avvikelsen'; END IF;
 IF NOT p_safety_critical AND (p_tires='not_checked' OR p_lights='not_checked' OR p_damage='not_checked') THEN
   RAISE EXCEPTION 'Kontrollera alla punkter eller rapportera en säkerhetskritisk avvikelse'; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_operation_id::text,0));
 SELECT * INTO v_check FROM public.vehicle_checks WHERE id=p_operation_id;
 IF FOUND THEN
   IF v_check.reported_by=v_uid AND v_check.company_id=public.get_my_company_id() AND public.has_role(v_uid,'driver'::public.app_role)
     AND v_check.assignment_id=p_assignment_id AND v_check.tires=p_tires AND v_check.lights=p_lights AND v_check.damage=p_damage
     AND v_check.safety_critical=p_safety_critical AND v_check.note=v_note THEN RETURN v_check; END IF;
   RAISE EXCEPTION 'Sparningsnyckeln används redan. Öppna kontrollen igen';
 END IF;
 SELECT * INTO v_assignment FROM public.assignments WHERE id=p_assignment_id FOR UPDATE;
 IF NOT FOUND OR v_assignment.company_id IS DISTINCT FROM public.get_my_company_id() OR
   v_assignment.assigned_driver_id IS DISTINCT FROM v_uid OR NOT public.has_role(v_uid,'driver'::public.app_role) OR
   v_assignment.status NOT IN ('pending','unassigned','active','delayed') THEN
   RAISE EXCEPTION 'Du har inte tillgång till ett öppet uppdrag för detta fordon' USING ERRCODE='42501'; END IF;
 IF v_assignment.vehicle_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id=v_assignment.vehicle_id AND v.company_id=v_assignment.company_id) THEN
   RAISE EXCEPTION 'Ett fordon i ditt företag måste kopplas till uppdraget'; END IF;
 INSERT INTO public.vehicle_checks(id,company_id,vehicle_id,assignment_id,reported_by,tires,lights,damage,safety_critical,note,status)
 VALUES(p_operation_id,v_assignment.company_id,v_assignment.vehicle_id,p_assignment_id,v_uid,p_tires,p_lights,p_damage,p_safety_critical,v_note,CASE WHEN v_issue THEN 'open' ELSE 'recorded' END) RETURNING * INTO v_check;
 RETURN v_check;
END $function$;
REVOKE ALL ON FUNCTION public.report_vehicle_check(uuid,uuid,text,text,text,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_vehicle_check(uuid,uuid,text,text,text,boolean,text) TO authenticated, service_role;

CREATE FUNCTION public.resolve_vehicle_check(p_check_id uuid,p_resolution text)
RETURNS public.vehicle_checks LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $function$
DECLARE v_check public.vehicle_checks; v_resolution text := btrim(coalesce(p_resolution,''));
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
   RAISE EXCEPTION 'Endast administratören kan avsluta avvikelsen' USING ERRCODE='42501'; END IF;
 IF length(v_resolution) NOT BETWEEN 1 AND 3000 THEN RAISE EXCEPTION 'Beskriv åtgärden med 1–3000 tecken'; END IF;
 SELECT * INTO v_check FROM public.vehicle_checks WHERE id=p_check_id AND company_id=public.get_my_company_id() FOR UPDATE;
 IF NOT FOUND OR v_check.status<>'open' THEN RAISE EXCEPTION 'Avvikelsen hittades inte eller är redan avslutad'; END IF;
 UPDATE public.vehicle_checks SET status='resolved',resolution=v_resolution,resolved_by=auth.uid(),resolved_at=now() WHERE id=p_check_id RETURNING * INTO v_check;
 RETURN v_check;
END $function$;
REVOKE ALL ON FUNCTION public.resolve_vehicle_check(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_vehicle_check(uuid,text) TO authenticated, service_role;
COMMENT ON TABLE public.vehicle_checks IS 'Driver observations only: never a roadworthiness certificate and never starts assignment time. Immutable reports; company admins resolve deviations through RPC.';