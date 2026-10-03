-- Venue bookings gain a staff decision: 'approved' and 'rejected'. 'auto'
-- keeps meaning "booked, awaiting a decision" and still holds its slots.
--
-- New enum values cannot be used in the transaction that adds them, so this
-- file only adds them; 20260927130100 uses them.

ALTER TYPE public.venue_booking_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.venue_booking_status ADD VALUE IF NOT EXISTS 'rejected';
