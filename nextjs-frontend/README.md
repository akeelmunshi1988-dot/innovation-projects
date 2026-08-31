# DreamRugsCreation Next.js storefront

This folder is an isolated App Router migration of the customer storefront. The existing Vite app and FastAPI backend remain unchanged.

## Local development

1. Start FastAPI on `http://127.0.0.1:8000`.
2. Copy `.env.example` to `.env.local` and adjust URLs if needed.
3. Run `npm install` and `npm run dev` in this folder.
4. Open `http://localhost:3000`.

The Next server proxies `/api/*` and `/static/*` to `BACKEND_URL`. Public catalog and product pages render on the server, including canonical metadata, Open Graph tags and structured data.

## Production

Set `BACKEND_URL` to the private FastAPI origin and `NEXT_PUBLIC_SITE_URL=https://dreamrugscreation.in`, then run `npm run build` and `npm run start`. The generated standalone server can also be managed with PM2/systemd behind the existing Nginx proxy.
