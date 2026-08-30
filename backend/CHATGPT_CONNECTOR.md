# DreamRugsCreation ChatGPT connector

The backend exposes a private, Streamable HTTP MCP server at:

- Local: `http://127.0.0.1:8000/mcp/`
- Production: `https ://dreamrugscreation.in/mcp/`
   
## Production configuration

Set these values in `backend/.env` on the production server:

```env
MCP_CONNECTOR_TOKEN=generate-a-long-random-secret
MCP_TENANT_ID=1
BACKEND_URL=https://dreamrugscreation.in
FRONTEND_URL=https://dreamrugscreation.in
```

When `MCP_CONNECTOR_TOKEN` is omitted, local development falls back to the
existing `CATALOG_API_KEY`. Production should use a separate token.

The nginx `/mcp/` location in `DEPLOYMENT.md` must also be deployed. It passes
the `Authorization` header to FastAPI and disables proxy buffering.

## Add it to ChatGPT

In ChatGPT developer mode, add a custom MCP connector with the production URL
`https://dreamrugscreation.in/mcp/` and its bearer token. Keep the connector
private while testing.

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
