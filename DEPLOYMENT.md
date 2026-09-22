# Deploy RUSH90 to Vercel

## What is configured

- Vite frontend builds from `client/` into `client/dist`.
- `api/[...path].js` runs the existing Express API as a Vercel Function.
- MongoDB connections are cached and limited to a pool of five, which avoids a new Atlas connection on every warm invocation.
- `POST /api/blob/client-token` issues authenticated, short-lived Vercel Blob upload tokens for JPEG, PNG, and WebP files.

## One-time service setup

1. Create a MongoDB Atlas database user with access only to the `rush90` database. Copy the **Drivers** connection string and replace its password with the URL-encoded password.
2. In Atlas Network Access, permit connections from the deployment. For a public Vercel deployment, this commonly requires `0.0.0.0/0`; compensate by using a least-privilege database user and a strong password. Prefer private networking for production plans that support it.
3. Import this repository into Vercel. In the project Storage tab, create and connect a Vercel Blob store. Vercel supplies `BLOB_READ_WRITE_TOKEN`.
4. In Vercel Project Settings → Environment Variables, add the values below for Production, Preview, and Development as appropriate. Do not commit these values.

| Variable | Required value |
| --- | --- |
| `MONGO_URI` | Atlas `mongodb+srv` driver connection string |
| `JWT_SECRET` | Long unique random secret (at least 32 bytes) |
| `JWT_EXPIRES_IN` | e.g. `7d` |
| `BLOB_READ_WRITE_TOKEN` | Token created when the Blob store is connected |
| `CLIENT_URL` | Optional comma-separated browser origins when a different frontend calls the API |

## Deploy

Push to the connected Git repository, or run `vercel --prod` after linking the project. Vercel executes `npm run build`, publishes `client/dist`, and deploys the API function automatically.

## Local development

Copy `.env.example` to `.env` and fill in real values. Then run:

```sh
npm run dev
```

The Vite frontend runs on port 5173 and proxies `/api` to the Express server on port 5000. `vercel dev` is recommended when testing Vercel Blob client uploads locally.

## Upload flow

After authenticating, the browser should call `POST /api/blob/client-token` through the `@vercel/blob/client` `upload()` helper, including the JWT bearer token. The route only authorizes image MIME types; Blob returns a direct public URL after a successful upload.
