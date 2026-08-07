CREATE POLICY "Drivers can add articles to own assignments"
ON public.assignment_articles
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = public.get_my_company_id()
  AND public.has_role(auth.uid(), 'driver')
  AND EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_articles.assignment_id
      AND a.assigned_driver_id = auth.uid()
      AND a.company_id = public.get_my_company_id()
  )
);

CREATE POLICY "Drivers can delete articles on own assignments"
ON public.assignment_articles
FOR DELETE
TO authenticated
USING (
  company_id = public.get_my_company_id()
  AND public.has_role(auth.uid(), 'driver')
  AND EXISTS (
    SELECT 1 FROM public.assignments a
    WHERE a.id = assignment_articles.assignment_id
      AND a.assigned_driver_id = auth.uid()
      AND a.invoiced = false
  )
);