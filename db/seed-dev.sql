-- ---------------------------------------------------------------------------
-- Sample rows for LOCAL DEVELOPMENT ONLY.
--
--     npm run db:seed
--
-- NEVER run this against the production database. It exists so the dashboard has
-- something to render while the migration is being checked — an empty users
-- table cannot tell you whether the table, the delete button, and the timestamp
-- formatting actually work.
--
-- The passwords are fake. The panel displays this column in plaintext, exactly
-- as the PHP original did (PROJECT_ANALYSIS.md §7 finding 2), so nothing that
-- resembles a real password should ever be seeded here.
-- ---------------------------------------------------------------------------

INSERT INTO `users` (`email`, `passw`, `created_at`) VALUES
  ('first@example.com',  'not-a-real-password-1', '2026-01-02 09:15:00'),
  ('second@example.com', 'not-a-real-password-2', '2026-03-14 18:40:27'),
  ('third@example.com',  'not-a-real-password-3', '2026-07-30 23:59:59');

INSERT INTO `coupons` (`coupon_code`) VALUES
  ('WELCOME10'),
  ('SUMMER25');
