# Moi Market

Moi Market is a static product-advertising site. Sellers submit product details to the admin through WhatsApp; the admin reviews and publishes approved listings from the password-protected admin screen.

## GitHub Pages

The GitHub Actions workflow deploys the site to GitHub Pages when changes are pushed to `main` or when the workflow is run manually. The site consists of `index.html`, `styles.css`, and `app.js`; there is no build step.

Seller submissions open WhatsApp and do not create listings automatically; the site does not process payments or provide checkout. The product catalogue and admin sign-in use Supabase.

## Configure Supabase

1. In the Supabase SQL Editor, run (or re-run) [`supabase/schema.sql`](supabase/schema.sql). New `products` tables store price as a nonnegative numeric value. Re-running the script does not change the price column type of an existing table, so existing numeric-price tables need no migration. It also creates a `product-images` public-read bucket limited to 5 MB JPG, PNG, WebP, or GIF files. RLS allows only `public.admin_users` members to upload, replace, and delete bucket objects; product images are public, so do not upload private material.
2. In Supabase Authentication settings, disable public sign-ups. Do not create a public admin registration form.
3. In the Supabase dashboard, invite the intended admin email under Authentication → Users (or use its existing user account). The account must exist before it can be authorized.
4. In the SQL Editor, authorize the intended existing Auth account by email. Replace `ADMIN_EMAIL` with the intended address; verify the account before running this statement:

   ```sql
   insert into public.admin_users (id)
   select id
   from auth.users
   where lower(email) = lower('ADMIN_EMAIL')
   on conflict (id) do nothing;
   ```

   Only add trusted admin accounts. Do not commit the email or credentials to this repository. To revoke access, delete the corresponding row from `public.admin_users`.
5. The public Supabase project URL and publishable key are configured in `app.js`. These values are intended to be public in a static site. **Never use a service-role or secret key in browser code.**
6. Deploy the site. Visitors can read products; signed-in users listed in `admin_users` can add, edit, and delete them. The database row-level security policies enforce this even if someone bypasses the admin interface.

Admin access requires the Auth account to be added to `public.admin_users`; signing in alone does not grant product-management access. No admin access is claimed until that authorization is confirmed.
