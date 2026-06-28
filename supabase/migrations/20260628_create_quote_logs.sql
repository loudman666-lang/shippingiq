CREATE TABLE IF NOT EXISTS quote_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE quote_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS quote_logs_merchant_id_idx ON quote_logs(merchant_id);
CREATE INDEX IF NOT EXISTS quote_logs_created_at_idx ON quote_logs(created_at);
