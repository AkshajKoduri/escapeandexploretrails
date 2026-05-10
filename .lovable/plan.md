## Grant admin access to koduri134679@gmail.com

I found your account in the system. To give you admin access I'll add an `admin` role entry for your user in the `user_roles` table.

### What will happen
- Insert one row: `user_id = 387ec9d1-b7dd-4ebc-8d20-7fdedf7517ef`, `role = 'admin'`
- After this, when you log in with koduri134679@gmail.com you'll be able to open `/admin` and see the full admin dashboard (Trips, Bookings, Past Trips).

### Notes
- Make sure you've already signed up on the site with this email (you have — the account exists).
- No schema changes, no code changes — just a one-row data insert.
- If you ever want to revoke admin access, I can remove that row later.

Approve this and I'll run the insert.