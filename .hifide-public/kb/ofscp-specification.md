---
id: dfcb1509-b3d4-46ce-9161-7c6f5b9894b2
title: OFSCP Specification
tags: [ofscp, protocol, spec, identifiers, json-schema]
files: [docs/ofscp_spec.md, schemas/v0.1/provider-discovery.json, schemas/v0.1/defs/common.json, schemas/v0.1/defs/objects.json, schemas/v0.1/defs/identity.json, schemas/v0.1/defs/privacy.json, schemas/v0.1/defs/messaging.json, schemas/v0.1/user-profile.json, schemas/v0.1/user-account.json, schemas/v0.1/user-public-profile-response.json, schemas/v0.1/user-update-profile-request.json, schemas/v0.1/presence.json, schemas/v0.1/presence-update-request.json, schemas/v0.1/user-groups-response.json, schemas/v0.1/privacy-settings.json, schemas/v0.1/privacy-settings-update-request.json, schemas/v0.1/message.json, schemas/v0.1/reaction.json, schemas/v0.1/messages-page.json, schemas/v0.1/problem-details.json, schemas/v0.1/tiers-response.json, schemas/v0.1/notifications-webhook-registration.json, schemas/v0.1/notifications-delivery.json, schemas/v0.1/call-channel-state.json, schemas/v0.1/call-offer.json, schemas/v0.1/call-answer.json, schemas/v0.1/call-ice.json, tests/validate-schemas.mjs]
createdAt: 2025-12-13T20:35:29.752Z
updatedAt: 2025-12-16T20:18:38.704Z
---

Canonical spec lives in `docs/ofscp_spec.md`.

## Identifier rule

Identifiers and cross-object references **MUST** use the **URI form** (absolute HTTPS URLs). The `{id, home}` qualified-object form is **not allowed**.

## JSON Schema hosting (implemented)

Official JSON Schemas are hosted under `schemas/v0.1/`.

### Structure
- `schemas/v0.1/defs/common.json` — shared primitives (`HttpsUri`, `Rfc3339DateTime`, `MimeType`, `OpaqueCursor`, …)
- `schemas/v0.1/defs/objects.json` — `MetadataObject`, `MetadataList`, `Attachment`
- `schemas/v0.1/defs/identity.json` — `UserRef`, `UserProfile`, `UserAccount`
- `schemas/v0.1/defs/privacy.json` — `VisibilityPolicy`
- `schemas/v0.1/defs/messaging.json` — `BaseMessage`, `Reaction`, `TimelineItem`, `PagedResponse`

### Validation
Run local validation of sample payloads vs schemas:

```bash
npm test
```

Notes:
- Schemas intentionally allow forward-compatible extensions (`additionalProperties: true` on most objects) per spec §2.3.
- `$id` values currently use `https://example.invalid/...` placeholders until a canonical hosting base URL is chosen.
