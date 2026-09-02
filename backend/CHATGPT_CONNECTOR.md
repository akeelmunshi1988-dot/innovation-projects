# DreamRugsCreation ChatGPT connector

The backend exposes a private, Streamable HTTP MCP server at:

- Local: `http://127.0.0.1:8000/mcp/`
- Production: `https://dreamrugscreation.in/mcp/`
   
## Production configuration

Set these values in `backend/.env` on the production server:

```env
MCP_CONNECTOR_TOKEN=generate-a-long-random-secret
MCP_TENANT_ID=1
MCP_OAUTH_ACCESS_TOKEN_MINUTES=60
MCP_OAUTH_REFRESH_TOKEN_DAYS=30
BACKEND_URL=https://dreamrugscreation.in
FRONTEND_URL=https://dreamrugscreation.in
```

When `MCP_CONNECTOR_TOKEN` is omitted, local development falls back to the
existing `CATALOG_API_KEY`. Production should use a separate token.

The nginx `/mcp/`, `/.well-known/oauth-`, and `/oauth/` locations in
`DEPLOYMENT.md` must also be deployed. They expose OAuth discovery/login and
pass authenticated MCP traffic to FastAPI without response buffering.

Apply the OAuth migration before restarting the backend:

```bash
cd /var/www/dreamrugscreation-projects/backend
./venv/bin/alembic upgrade head
sudo systemctl restart dreamrugscreation
```

The static `MCP_CONNECTOR_TOKEN` remains useful for a controlled curl diagnostic,
but ChatGPT web authenticates through OAuth and an existing active staff account.

## Add it to ChatGPT

In ChatGPT web developer mode, create a private custom plugin with these values:

| Setting | Value |
|---|---|
| Name | `DreamRugsCreation Catalog` |
| Description | `Creates DreamRugsCreation rug catalog listings with a product image and five room visualizers.` |
| Connection | `Server URL` |
| Server URL | `https://dreamrugscreation.in/mcp/` |
| Authentication | `OAuth` |
| Registration method | `Dynamic Client Registration (DCR)` |
| Token endpoint auth method | `none` |
| Scopes | `catalog:read catalog:write` |

Do not enter a client ID or client secret when DCR is selected. ChatGPT registers
its callback automatically, opens the DreamRugsCreation authorization page, and
asks the operator to sign in with an active staff account belonging to
`MCP_TENANT_ID`. Keep the plugin private while testing.

OAuth endpoints exposed by the backend:

- `/.well-known/oauth-protected-resource/mcp/`
- `/.well-known/oauth-authorization-server`
- `/oauth/register`
- `/oauth/authorize`
- `/oauth/token`
- `/oauth/revoke`

The server currently exposes:

- `list_catalog_materials`
- `import_catalog_image`
- `create_catalog_item`
- `get_catalog_item`

The intended run is:

1. Generate one upright, front-facing transparent main image.
2. Generate five separate room visualizers.
3. Import all six images with `import_catalog_image`.
4. Ask for and confirm title, description, material, weave, price, and sizes.
5. Call `create_catalog_item` once, passing the main image first and five room
   images in gallery order.
6. Return the `catalog_url` produced by the tool.

The MCP endpoint deliberately refuses catalog creation unless exactly five
gallery images are supplied and every image has first been copied into
DreamRugsCreation storage.
