SET ROLE service_role;
SELECT public.change_scheduled_occurrence(:'actor'::uuid, :'occurrence'::uuid, :'revision'::integer, 'instructions', 'Second edit');
