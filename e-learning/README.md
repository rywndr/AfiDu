This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Environment

`.env.local` needs:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | The same Neon database the Django app in `../src` owns. |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | better-auth session signing and callback base. |
| `NEXT_PUBLIC_MANAGEMENT_URL` | Public base URL of the Django management app. Defaults to `http://127.0.0.1:8000`. |
| `B2_ENDPOINT_URL`, `B2_REGION_NAME`, `B2_BUCKET_NAME`, `B2_KEY_ID`, `B2_APPLICATION_KEY` | Backblaze B2, copied from the Django `.env`. All five, or none. |

Without the `B2_*` values the module upload form still loads but only accepts
write-up materials: there is nowhere to put a file, and the local `MEDIA_ROOT`
Django falls back to is not reachable from here.

## Study material uploads need a bucket CORS rule

Files are uploaded **straight from the browser to B2** with a presigned PUT
(`lib/b2.ts`), not through a route handler: Vercel caps request bodies far below
the 500MB a video material is allowed. The signed PUT is what makes an XHR
progress bar possible without proxying the bytes.

Because the browser talks to B2 directly, the bucket must allow it. One rule is
enough:

```bash
b2 bucket update <bucket-name> --cors-rules '[
  {
    "corsRuleName": "elearningUploads",
    "allowedOrigins": ["http://localhost:3000", "https://<your-app>.vercel.app"],
    "allowedOperations": ["s3_put"],
    "allowedHeaders": ["*"],
    "exposeHeaders": ["etag"],
    "maxAgeSeconds": 3600
  }
]'
```

Downloads do not need a rule: `/api/study-materials/[id]/file` redirects to a
signed GET, so the browser follows a normal top-level navigation.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
