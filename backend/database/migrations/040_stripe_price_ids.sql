-- 040: Add Stripe price ID columns to planes table
-- These store the Stripe Price IDs for each plan/cycle combination

ALTER TABLE planes ADD COLUMN IF NOT EXISTS stripe_price_id_mensual TEXT;
ALTER TABLE planes ADD COLUMN IF NOT EXISTS stripe_price_id_anual TEXT;

COMMENT ON COLUMN planes.stripe_price_id_mensual IS 'Stripe Price ID for monthly billing';
COMMENT ON COLUMN planes.stripe_price_id_anual IS 'Stripe Price ID for annual billing';
