-- ============================================================
-- 003_seed_companies.sql
-- Bootstrap company registry with known fintechs
-- Used to seed buzz tracking from day one
-- ============================================================

INSERT INTO companies (name, slug, website, hq_country, subsectors, business_model, is_public)
VALUES
  -- Payments
  ('Stripe', 'stripe', 'https://stripe.com', 'US', ARRAY['payments', 'infrastructure'], 'B2B', false),
  ('Adyen', 'adyen', 'https://adyen.com', 'Netherlands', ARRAY['payments'], 'B2B', true),
  ('Checkout.com', 'checkout-com', 'https://checkout.com', 'UK', ARRAY['payments'], 'B2B', false),
  ('Brex', 'brex', 'https://brex.com', 'US', ARRAY['payments', 'b2b-finance'], 'B2B', false),
  ('Ramp', 'ramp', 'https://ramp.com', 'US', ARRAY['payments', 'b2b-finance'], 'B2B', false),
  ('Marqeta', 'marqeta', 'https://marqeta.com', 'US', ARRAY['payments', 'infrastructure'], 'B2B', true),
  ('Nuvei', 'nuvei', 'https://nuvei.com', 'Canada', ARRAY['payments'], 'B2B', true),
  ('Paysafe', 'paysafe', 'https://paysafe.com', 'UK', ARRAY['payments'], 'B2B', true),

  -- Lending
  ('Affirm', 'affirm', 'https://affirm.com', 'US', ARRAY['lending'], 'B2C', true),
  ('Klarna', 'klarna', 'https://klarna.com', 'Sweden', ARRAY['lending', 'payments'], 'B2C', false),
  ('Blend', 'blend', 'https://blend.com', 'US', ARRAY['lending', 'infrastructure'], 'B2B', true),
  ('Fundbox', 'fundbox', 'https://fundbox.com', 'US', ARRAY['lending', 'b2b-finance'], 'B2B', false),
  ('Pipe', 'pipe', 'https://pipe.com', 'US', ARRAY['lending', 'b2b-finance'], 'B2B', false),
  ('Creditas', 'creditas', 'https://creditas.com', 'Brazil', ARRAY['lending'], 'B2C', false),

  -- Wealth & Investing
  ('Betterment', 'betterment', 'https://betterment.com', 'US', ARRAY['wealthtech'], 'B2C', false),
  ('Wealthfront', 'wealthfront', 'https://wealthfront.com', 'US', ARRAY['wealthtech'], 'B2C', false),
  ('Robinhood', 'robinhood', 'https://robinhood.com', 'US', ARRAY['wealthtech', 'trading'], 'B2C', true),
  ('Public.com', 'public-com', 'https://public.com', 'US', ARRAY['wealthtech', 'trading'], 'B2C', false),
  ('Titan', 'titan', 'https://titanvest.com', 'US', ARRAY['wealthtech'], 'B2C', false),
  ('Composer', 'composer', 'https://composer.trade', 'US', ARRAY['wealthtech', 'trading'], 'B2C', false),

  -- Banking & Neobanks
  ('Chime', 'chime', 'https://chime.com', 'US', ARRAY['banking'], 'B2C', false),
  ('Revolut', 'revolut', 'https://revolut.com', 'UK', ARRAY['banking', 'payments'], 'B2C', false),
  ('Monzo', 'monzo', 'https://monzo.com', 'UK', ARRAY['banking'], 'B2C', false),
  ('N26', 'n26', 'https://n26.com', 'Germany', ARRAY['banking'], 'B2C', false),
  ('Nubank', 'nubank', 'https://nubank.com.br', 'Brazil', ARRAY['banking'], 'B2C', true),
  ('Column', 'column', 'https://column.com', 'US', ARRAY['banking', 'infrastructure'], 'B2B', false),
  ('Mercury', 'mercury', 'https://mercury.com', 'US', ARRAY['banking', 'b2b-finance'], 'B2B', false),
  ('Relay', 'relay', 'https://relayfi.com', 'US', ARRAY['banking', 'b2b-finance'], 'B2B', false),
  ('Grasshopper', 'grasshopper', 'https://grasshopperbank.com', 'US', ARRAY['banking'], 'B2B', false),

  -- Insurance
  ('Lemonade', 'lemonade', 'https://lemonade.com', 'US', ARRAY['insurtech'], 'B2C', true),
  ('Root Insurance', 'root-insurance', 'https://joinroot.com', 'US', ARRAY['insurtech'], 'B2C', true),
  ('Hippo', 'hippo', 'https://hippo.com', 'US', ARRAY['insurtech'], 'B2C', true),
  ('Next Insurance', 'next-insurance', 'https://nextinsurance.com', 'US', ARRAY['insurtech'], 'B2B', false),
  ('Vouch', 'vouch', 'https://vouch.us', 'US', ARRAY['insurtech'], 'B2B', false),

  -- Infrastructure & RegTech
  ('Plaid', 'plaid', 'https://plaid.com', 'US', ARRAY['infrastructure', 'data-analytics'], 'B2B', false),
  ('MX', 'mx', 'https://mx.com', 'US', ARRAY['infrastructure', 'data-analytics'], 'B2B', false),
  ('Alloy', 'alloy', 'https://alloy.com', 'US', ARRAY['regtech', 'infrastructure'], 'B2B', false),
  ('Unit21', 'unit21', 'https://unit21.ai', 'US', ARRAY['regtech'], 'B2B', false),
  ('Sardine', 'sardine', 'https://sardine.ai', 'US', ARRAY['regtech'], 'B2B', false),
  ('Socure', 'socure', 'https://socure.com', 'US', ARRAY['regtech', 'infrastructure'], 'B2B', false),
  ('Onfido', 'onfido', 'https://onfido.com', 'UK', ARRAY['regtech'], 'B2B', false),

  -- Crypto & Web3 Fintech
  ('Coinbase', 'coinbase', 'https://coinbase.com', 'US', ARRAY['crypto'], 'B2C', true),
  ('Paxos', 'paxos', 'https://paxos.com', 'US', ARRAY['crypto', 'infrastructure'], 'B2B', false),
  ('BitGo', 'bitgo', 'https://bitgo.com', 'US', ARRAY['crypto', 'infrastructure'], 'B2B', false),
  ('Anchorage Digital', 'anchorage-digital', 'https://anchorage.com', 'US', ARRAY['crypto', 'banking'], 'B2B', false),

  -- B2B Finance
  ('Bill.com', 'bill-com', 'https://bill.com', 'US', ARRAY['b2b-finance', 'payments'], 'B2B', true),
  ('Tipalti', 'tipalti', 'https://tipalti.com', 'US', ARRAY['b2b-finance', 'payments'], 'B2B', false),
  ('Melio', 'melio', 'https://meliopayments.com', 'US', ARRAY['b2b-finance', 'payments'], 'B2B', false),
  ('Capchase', 'capchase', 'https://capchase.com', 'US', ARRAY['b2b-finance', 'lending'], 'B2B', false),
  ('Clearco', 'clearco', 'https://clear.co', 'Canada', ARRAY['b2b-finance', 'lending'], 'B2B', false)

ON CONFLICT (slug) DO NOTHING;
