# OrbitLabs Onboarding Training & Progress Tracker

An online onboarding course for new staff, with five chapters and chapter quizzes. Progress saves automatically, and managers track completion and scores on a private dashboard.

## What's here

| Path | What it is |
| --- | --- |
| `website/index.html` | The training deck staff use (sign-in, slides, quizzes, progress saving) |
| `website/admin.html` | Private dashboard for managers (`/admin.html` on the live site) |
| `website/config.js` | Settings: Supabase Project URL and anon/publishable key |
| `website/supabase.js` | Supabase client library (v2.117.2), bundled locally |
| `setup.sql` | One-time database setup, run in Supabase → SQL Editor |
| `netlify.toml` | Tells Netlify to publish the `website/` folder |

## How it fits together

Staff use the deck → progress is saved to Supabase → managers view it on the dashboard.
Netlify hosts the website and redeploys automatically whenever this repository changes.

## Setup checklist

1. **Supabase:** create a project, run `setup.sql` (change the admin email at the bottom first), and turn off public sign-ups under Authentication → Sign In / Providers.
2. **Accounts:** add staff under Authentication → Users → Add user, ticking "Auto Confirm User".
3. **Connect:** put the Project URL and anon/publishable key into `website/config.js`. The anon key is meant to be public; never use the secret or service_role key.
4. **Netlify:** Add new site → Import from GitHub → choose this repository → Deploy.

## Making changes

Edit files here on GitHub (pencil icon) and commit. Netlify picks up the change within a minute or two.
