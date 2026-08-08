-- ---------------------------------------------------------------------------
-- Schema for the admin panel's MySQL database.
--
-- Apply it with:  npm run db:init
--
-- WHERE THIS SHAPE COMES FROM
-- The original application shipped no schema file and no migrations, so these
-- tables are reconstructed from how the PHP code reads and writes them:
--
--   users    dashboard.php:17      SELECT * FROM users ORDER BY id DESC
--            dashboard.php:46-49   reads id, email, passw, created_at
--            delete_user.php:6     DELETE FROM users WHERE id = ...
--            check_new_user.php:9  SELECT MAX(id) AS last_id FROM users
--   coupons  dashboard.php:13      INSERT INTO coupons (coupon_code) VALUES ...
--            dashboard.php:20      SELECT * FROM coupons ORDER BY id DESC LIMIT 1
--
-- It matches prisma/schema.prisma. See PROJECT_ANALYSIS.md §4.
--
-- WHY THE COLUMNS ALLOW NULL
-- No INSERT INTO users exists anywhere in this repository — the rows come from a
-- separate signup application that is not in it (PROJECT_ANALYSIS.md §3). Since
-- that application's INSERT statement cannot be inspected, NOT NULL constraints
-- would risk rejecting writes it has always been allowed to make. `created_at`
-- defaults to the insert time so a writer that omits it still gets a timestamp,
-- which is what the PHP dashboard displays.
--
-- Tighten these once the signup application's INSERT is known.
--
-- Re-running this file is safe: it creates tables only if they are missing and
-- never drops or alters an existing one.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT          NOT NULL AUTO_INCREMENT,
  `email`      VARCHAR(255)     NULL,
  `passw`      VARCHAR(255)     NULL,
  `created_at` DATETIME         NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `coupons` (
  `id`          INT          NOT NULL AUTO_INCREMENT,
  `coupon_code` VARCHAR(255)     NULL,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- Both queries that order these tables use `ORDER BY id DESC`, which the primary
-- key already serves, so no secondary index is needed. If the signup application
-- looks users up by email, an index on `email` would help it — left out here
-- because adding one blind could change behaviour it depends on (a UNIQUE index
-- in particular would start rejecting duplicate signups).
