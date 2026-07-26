# PMS Integration Feasibility — Hostfully & Hostaway

## Summary
Both Hostfully and Hostaway expose REST APIs suitable for a server-to-server integration from the MeInspect backend (Cloudflare Workers). Feasible with moderate effort (2-4 weeks for a first sync + trigger integration). No blocking technical obstacles found.

## Hostaway
- **Auth**: OAuth2 client-credentials flow. Request an Account ID + Client Secret from Hostaway support, exchange for a short-lived Bearer access token (`POST /v1/accessTokens`).
- **Key endpoints**: `GET /v1/listings` (properties), `GET /v1/reservations` (bookings incl. check-in/out dates), `GET /v1/users` (owners/agents).
- **Webhooks**: Hostaway supports webhook subscriptions for reservation created/updated/cancelled — ideal to auto-trigger a MeInspect move-in/move-out inspection.
- **Rate limits**: ~15 requests/10s per account; fine for periodic sync + webhook-driven triggers.

## Hostfully
- **Auth**: API key (agency-level) passed as header, or OAuth2 for the newer Public API (Pinnacle).
- **Key endpoints**: `GET /v1/properties`, `GET /v1/bookings`, `GET /v1/property-owners`.
- **Webhooks**: Available on Pro/Enterprise plans for booking status changes.
- **Note**: Hostfully's public API requires a partner/API agreement — apply via their developer portal before integration begins.

## Proposed Architecture
1. **New backend routes** in `backend/src/index.ts`:
   - `POST /api/pms/connect` — store encrypted PMS API credentials per user (D1 table `pms_connections`).
   - `POST /api/pms/webhook/hostaway` and `/hostfully` — receive booking events, verify signature, enqueue inspection creation.
   - `GET /api/pms/properties` — proxy + cache the PMS property list so the app can pre-fill the "New Inspection" property step.
2. **Data mapping**: PMS `listing/property` → MeInspect `PropertyDetails`; PMS `reservation/booking` guest → MeInspect `tenant`/`landlord` party details; check-in/check-out dates → `tenancy.leaseStartDate/leaseEndDate`.
3. **Trigger flow**: Reservation webhook (check-in or check-out) → backend creates a draft `Inspection` row scoped to the property manager's account → push notification/email prompts the inspector to complete it in-app.
4. **Security**: PMS credentials stored as Cloudflare Worker secrets or encrypted D1 columns, never exposed to the frontend; all PMS calls proxied server-side.

## Next Steps
- Confirm which PMS(s) the business prioritizes (Hostaway is simpler to start with — self-serve API keys, no partner approval needed).
- Request Hostaway API credentials (self-service in their dashboard) and Hostfully partner access (requires application).
- Build `pms_connections` schema + the two proxy routes above as the MVP integration.
