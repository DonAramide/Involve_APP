-- Gate clock emails: turn notify flags ON by default (were DEFAULT false).
-- Staging/prod apply only through normal migration review. Safe, non-destructive.

ALTER TABLE public.school_id_card_settings
  ALTER COLUMN notify_student_arrival SET DEFAULT true,
  ALTER COLUMN notify_student_departure SET DEFAULT true,
  ALTER COLUMN notify_staff_arrival SET DEFAULT true,
  ALTER COLUMN notify_staff_departure SET DEFAULT true;

UPDATE public.school_id_card_settings
SET
  notify_student_arrival = true,
  notify_student_departure = true,
  notify_staff_arrival = true,
  notify_staff_departure = true,
  updated_at = transaction_timestamp()
WHERE notify_student_arrival IS DISTINCT FROM true
   OR notify_student_departure IS DISTINCT FROM true
   OR notify_staff_arrival IS DISTINCT FROM true
   OR notify_staff_departure IS DISTINCT FROM true;
