-- Seed chains required for CI tests
-- 80002 = Polygon Amoy (primary test chain)
-- 97    = BNB Testnet  (used as a "disabled chain" in transaction validation tests)

INSERT INTO chains (chain_id, name, rpc_url, native_token, polling_interval, status, created_at, updated_at)
VALUES
  (80002, 'Polygon Amoy', 'https://rpc-amoy.polygon.technology', 'POL', 10000, 'active', NOW(), NOW()),
  (97,    'BNB Testnet',  'https://data-seed-prebsc-1-s1.binance.org:8545', 'BNB', 10000, 'active', NOW(), NOW())
ON CONFLICT (chain_id) DO NOTHING;
