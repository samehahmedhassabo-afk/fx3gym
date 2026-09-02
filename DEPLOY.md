# FX3 Vercel Deployment

This folder is a standalone Next.js deployment, isolated from the Electron desktop app.
All FX3 source code, pages, and API routes are included.

## Prerequisites

- Node.js 18+ installed
- Vercel CLI installed globally: `npm i -g vercel`
- A PostgreSQL database (Vercel Postgres, Neon, Supabase, etc.)

## Deployment Steps

### 1. Authenticate Vercel CLI

```bash
vercel login
```

### 2. Link this folder to your Vercel project

```bash
cd "F:\FX3 APPS\fx3 offline windows app\vercel app"
vercel link
```

When prompted:
- Select your `fx3gym` team/org.
- Confirm the project name or create `fx3gym`.

### 3. Set required environment variables in Vercel

```bash
vercel env add DATABASE_URL production
# Paste your PostgreSQL connection string from Step 1

vercel env add AUTH_SECRET production
# Paste any 32+ character random string
```

You can also set these in the Vercel dashboard under Project Settings → Environment Variables.

### 4. Deploy to production

```bash
vercel --prod
```

This will run:
1. `npm install`
2. `prisma generate`
3. `prisma migrate deploy`
4. `next build`

### 5. Verify deployment

```bash
vercel logs <your-deployment-url> --follow
```

## First Run Checklist

- [ ] PostgreSQL database created and connection string copied
- [ ] Vercel CLI logged in (`vercel login`)
- [ ] Project linked (`vercel link`)
- [ ] `DATABASE_URL` set in Vercel project settings
- [ ] `AUTH_SECRET` set in Vercel project settings
- [ ] First deployment completed successfully
- [ ] Database tables created via Prisma migrations

## Troubleshooting

**Build fails with `DATABASE_URL` error during `npm install`:**
- This was fixed in the latest version of this deployment config.
- If you see this, make sure you have the latest version of the deployment folder.

**Build fails with Prisma errors:**
- Ensure `DATABASE_URL` is set in Vercel project settings, not just locally.
- The `vercel-build` script now runs `prisma generate` and `prisma migrate deploy` before `next build`.

**App loads but shows database errors:**
- Check that `DATABASE_URL` is set for the **production** environment in Vercel.
- Verify your PostgreSQL database is accessible from Vercel's IPs.

## Notes

- Uploads are stored in `/tmp` during serverless execution; they are ephemeral unless you connect Vercel Blob storage.
- The original Windows/Electron app is untouched in `..\`.

## Notes

- Uploads are stored in `/tmp` during serverless execution; they are ephemeral unless you connect Vercel Blob storage.
- The original Windows/Electron app is untouched in `..\`.
