-- RPC for atomic bonus quota increment
CREATE OR REPLACE FUNCTION increment_bonus_quota(t_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE tenants
  SET bonus_quota = COALESCE(bonus_quota, 0) + amount
  WHERE id = t_id;
END;
$$ LANGUAGE plpgsql;
