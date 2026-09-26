-- Retire the in-app bug-reporting feature and permanently remove its data.

BEGIN;

DROP TABLE IF EXISTS public.bug_reports;
DROP FUNCTION IF EXISTS public.set_bug_reports_updated_at();
DROP TYPE IF EXISTS public.bug_report_status;

COMMIT;
