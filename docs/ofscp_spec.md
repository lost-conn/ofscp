# Open Federated Social Communications Protocol (OFSCP)

> **Status:** Draft v0.1 (for implementation feedback)  
> **Audience:** Provider operators, client developers, interoperability testers  
> **Doc history:** Derived from OFSCP architectural diagrams, 2025-03



## 1. Introduction

### 1.1. Goals & Scope

OFSCP defines an application-layer protocol that allows independently operated providers to offer a shared social + messaging experience. The specification focuses on:

* describing the HTTP APIs and payloads providers expose
* describing how clients authenticate, publish, subscribe, and call
* enabling federation between providers with consistent privacy models

Everything in this document uses RFC 2119 keywords (**MUST**, **SHOULD**, etc.).

### 1.2. Terminology

| Term | Description |
| --- | --- |
| **Provider** | A server (e.g., `example.com`) that stores user accounts, groups, channels, and delivers messages for its users. |
| **Client** | Any application acting on behalf of a user (mobile, desktop, bot, gateway). |
| **Group** | A community hosted on a provider that organizes channels and joined users. |
| **Channel** | Logical stream of posts/messages inside a group. |
| **Call Channel** | A channel that can host an active audio/video session. |
| **Home Provider** | Provider where a user account is registered. |
| **Remote Provider** | Other providers participating in federation for a channel, DM, or broadcast. |

---

## 2. Compatibility & Extensibility (Normative)

### 2.1. Protocol versioning

OFSCP protocol versions use **Semantic Versioning** (SemVer): `MAJOR.MINOR.PATCH`.

* **MAJOR** increments indicate breaking changes.
* **MINOR** increments indicate backward-compatible additions.
* **PATCH** increments indicate clarifications and non-behavioral corrections.

Providers **MUST** publish their supported protocol version as `provider.protocolVersion` in the discovery document.

### 2.2. Standard identifier forms

For interoperability, implementations **MUST** use the **URI form** consistently across all endpoints.

* **URI form:** references are absolute HTTPS URLs.

### 2.3. Forward compatibility

To enable evolution without breaking interoperability:

* Clients and providers **MUST** ignore unknown JSON object fields.
* Clients and providers **MUST** ignore unknown event types.
* Unknown `message.type` values **MUST** be rendered as a generic “message” using best-effort content display.

### 2.4. Canonical identifiers

Objects commonly include an `id`. For cross-provider interoperability, implementations **MUST** treat IDs as **opaque**.

To avoid collisions, implementations **MUST** use **URI identifiers**: globally unique, stable URLs (e.g. `https://social.example/api/messages/msg_123`).

Within this document, examples may show short IDs (e.g. `msg_1`) for readability.

### 2.5. Canonical data formats

* Timestamps **MUST** be RFC 3339 / ISO-8601 strings with timezone (UTC recommended), e.g. `2025-03-01T12:00:00Z`.
* `mime` values **MUST** be valid IANA media types.
* Pagination cursors **MUST** be treated as opaque strings.

Providers **SHOULD** define maximum payload sizes (request and response) and return **413** when exceeded.

### 2.6. Standard error envelope

Providers **SHOULD** return errors using RFC 7807 Problem Details (`application/problem+json`) with stable `type` URIs.

Providers **MAY** additionally include an `errorCode` field for machine-friendly, stable short codes.

---

## 3. Provider Discovery

### 3.1. Well-known endpoint

Every provider **MUST** host a discovery document at:

```
GET https://{provider}/.well-known/ofscp-provider
Content-Type: application/json
```

**Response:**
```json
{
  "provider": {
    "domain": "social.example",
    "protocolVersion": "0.1.0",
    "software": {
      "name": "example-ofscp",
      "version": "2025.03.0"
    },
    "contact": "mailto:admin@social.example",
    "authentication": {
      "issuer": "https://social.example",
      "jwks_uri": "https://social.example/.well-known/jwks.json",
      "algorithms": ["RS256"],
      "audiences": ["ofscp-api"],
      "login_endpoint": "https://social.example/api/auth/login",
      "introspection_endpoint": "https://social.example/oauth/introspect"
    }
  },
  "capabilities": {
    "messageTypes": ["memo", "article", "message", "reaction"],
    "discoverability": ["private", "group", "public", "discoverable"],
    "metadataSchemas": [
      {
        "id": "com.example.poll",
        "uri": "https://social.example/meta/poll.json"
      }
    ]

  }
}
```

Providers **MUST** include a `protocolVersion` matching this specification’s SemVer rules.

Clients **MAY** cache discovery documents, but providers **SHOULD** set HTTP caching headers (e.g. `Cache-Control`, `ETag`).

### 3.2. Standard API base path (Normative)

To simplify client implementation and improve interoperability, OFSCP **standardizes** the HTTP API endpoint paths.

Providers **MUST** implement the standard endpoints exactly as specified in this document, relative to their domain (e.g. `https://{provider}`), and **MUST NOT** require clients to read per-resource endpoint URLs from discovery for core APIs.

The base path for all standardized HTTP APIs is:

* `https://{provider}/api/...`

Providers **MAY** expose additional, non-standard endpoints, but those endpoints are out of scope for this specification.

### 3.3. Provider Descriptor Schema

The discovery payload above is the canonical schema.

Discovery is intended to communicate provider identity, supported protocol version, authentication verification parameters, and optional capability metadata.

Discovery **MUST NOT** be used to redefine the standardized endpoint paths in this specification.

### 3.4. Provider Interconnection

Providers **MAY** maintain a list of "Known Providers" to facilitate federation. This list can optionally be populated via:
1.  **Manual Peering:** Administrators explicitly adding trusted domains.
2.  **Scraping:** Discovering user home domains from incoming cross-provider interactions.
3.  **Referral:** Querying other providers for their known peers.

---

## 4. Identity & Authentication

This specification standardizes **JWT Bearer access tokens** for API session authentication, including a required JWT profile, discovery metadata for offline verification, and federated validation rules.

Providers are responsible for authenticating human users and issuing JWTs.

### 4.1. Authentication Flows

OFSCP does not standardize how a provider authenticates a user interactively (passwords, passkeys, SSO, etc.).

For interoperability, OFSCP standardizes the **token format** and how tokens are **validated across providers**.

If a provider exposes interactive login endpoints, it **MUST** document them (if any) in discovery (see §4.5).

Note: The `.well-known/ofscp-provider` example in §3.1 includes a `login_endpoint`. That field is OPTIONAL; providers that do not expose an interactive login endpoint MAY omit it.

### 4.2. Session Authentication

*   Clients **MUST** authenticate API requests using the `Authorization: Bearer <JWT>` header.
*   Providers **MUST** validate the JWT per §4.3 and §4.6 (signature, claims, and lifetime).
*   If the JWT expires, clients **SHOULD** obtain a new JWT using the provider’s authentication mechanism.

### 4.3. Normative JWT Profile

Providers and clients MUST follow these minimum interoperability requirements.

#### 4.3.1. Access tokens

* Access tokens **MUST** be JWTs (RFC 7519).
* Access tokens **MUST** be signed (JWS). Providers **MUST NOT** issue unsigned tokens (e.g. `alg: "none"`).
* Providers **MUST** support `RS256`.
* Providers **SHOULD** support `EdDSA`.
* Providers **MUST NOT** use `HS256` in federated deployments.
* Providers **SHOULD** issue short-lived access tokens (RECOMMENDED: `exp` 5–15 minutes after issuance).

#### 4.3.2. Required JWT claims

Issued JWT access tokens **MUST** include:
* `iss` (issuer): absolute HTTPS URL identifying the issuing provider.
* `sub` (subject): stable, opaque identifier for the authenticated user.
* `aud` (audience): identifies the intended recipient provider/API (see §4.3.4).
* `exp`, `iat`.

Issued JWT access tokens **SHOULD** include:
* `jti` (token identifier) for audit/revocation correlation.
* `scope` (space-separated string) or `scp` (array) describing granted scopes.

Providers **MAY** include convenience claims like `preferred_username`, but clients/remote providers **MUST NOT** rely on them for authorization decisions.

#### 4.3.3. Subject identifier format

For federation compatibility, `sub` **MUST** be globally unique under `iss`.

Providers **SHOULD** use a URI identifier consistent with OFSCP canonical identifiers.

Example:
* `iss`: `https://a.com`
* `sub`: `https://a.com/api/users/usr_123`

#### 4.3.4. Audience rules

Remote providers validating tokens **MUST** validate `aud`.

If a client calls Remote Provider B with a token minted by Provider A, the access token presented to B **MUST** include an `aud` value that matches B (either B’s base URL or a provider-defined audience published in discovery).

#### 4.3.5. Transport

* JWTs **MUST** be sent only via the `Authorization` header.
* Clients **MUST NOT** send JWTs in query parameters.

#### 4.3.6. Error semantics

* Invalid or missing JWT: respond with **401**.
* Valid JWT but insufficient permissions: respond with **403**.

### 4.4. Provider Discovery Additions for JWT Verification

Providers MUST publish JWT verification metadata in `.well-known/ofscp-provider`.

The `provider.authentication` object:
* `issuer` (REQUIRED): the `iss` value remote providers/clients should expect.
* `jwks_uri` (REQUIRED): absolute HTTPS URL of JWKS endpoint.
* `algorithms` (OPTIONAL): list of supported JWT `alg` values.
* `audiences` (OPTIONAL): acceptable `aud` values for this provider’s APIs.
* `introspection_endpoint` (OPTIONAL): token introspection endpoint for immediate revocation checks.

Note: interactive login endpoints are not required by this spec; if provided, they SHOULD be documented (see §4.5).

#### 4.4.1. Example

```json
{
  "provider": {
    "authentication": {
      "issuer": "https://social.example",
      "jwks_uri": "https://social.example/.well-known/jwks.json",
      "algorithms": ["RS256"],
      "audiences": ["ofscp-api"],
      "introspection_endpoint": "https://social.example/oauth/introspect"
    }
  }
}
```

### 4.5. Provider Authentication Discovery (Interactive)

If a provider exposes an interactive login endpoint intended for first-party clients, it **SHOULD** publish it in discovery as:
* `provider.authentication.login_endpoint` (OPTIONAL): HTTPS endpoint for interactive login.

The request/response format of interactive login endpoints is provider-defined.

### 4.6. Remote Provider Validation Rules (Federation)

When a Remote Provider B receives a Bearer token issued by Provider A, B **MUST**:
1. Resolve A’s discovery document (`/.well-known/ofscp-provider`) and cache it.
2. Fetch A’s JWKS and cache it, honoring HTTP caching headers.
3. Verify JWT signature using JWKS.
4. Validate:
   * `iss` matches A’s issuer
   * `aud` matches B
   * `exp` not expired (allow small clock skew, RECOMMENDED: ≤ 60s)
5. Map `sub` to a federated user identity.

B **SHOULD** treat token claims as authentication only; authorization remains local policy.

### 4.7. Refresh tokens, rotation, and revocation (Guidance)

Providers **SHOULD** support refresh tokens for interactive clients.

If refresh tokens are supported:
* Refresh tokens **SHOULD** be opaque, random, and stored server-side.
* Providers **SHOULD** rotate refresh tokens (one-time-use) and detect replay.

Because JWT access tokens are valid until `exp`, providers **SHOULD** implement at least one of:
* short-lived access tokens (RECOMMENDED above)
* an introspection endpoint (OPTIONAL) for immediate revocation checks
* `jti` denylist for high-risk endpoints

Remote providers **MAY** call introspection for sensitive actions.

### 4.8. Authentication errors (Problem Details)

For auth failures, providers **SHOULD** return RFC 7807 `application/problem+json`.

Recommended problem types:
* `https://{provider}/problems/auth/missing-authorization`
* `https://{provider}/problems/auth/invalid-token`
* `https://{provider}/problems/auth/insufficient-scope`

Include `status` (401/403), `title`, `detail`, and optional `errorCode`.

### 4.9. Federated User Lookup

When a remote provider needs to verify a user:

```http
GET /api/identity/users/{handle}@{domain}
Authorization: Signature <...> 
```

Response:
```json
{
  "id": "https://a.com/api/users/usr_123",
  "handle": "jane",
  "domain": "a.com",
  "updatedAt": "2025-03-01T12:00:00Z"
}
```

Remote providers **MUST** cache user info and respect `updatedAt` for invalidation.

---

## 5. Data Models

### 5.1. User

Users have both *public profile* fields and *private account settings* fields.

Providers **MUST NOT** expose private account fields to unauthenticated parties.

Providers **SHOULD NOT** include private account fields in federated lookups.

Additionally, some user-adjacent data (notably: presence, bio, and group membership visibility) may have user-configurable privacy settings. To avoid accidental leakage, providers **MUST** expose these via dedicated endpoints that apply the subject’s privacy policy when returning data to a viewer. See [section 6](#6-user-privacy-endpoints-profile-presence-membership-listing) for more details.

#### 5.1.1. UserProfile (public)

`UserProfile` is the minimal, safe-to-share representation of a user used in membership lists, message author fields, and federated lookups.

**UserProfile (example):**
```json
{
  "id": "https://a.com/api/users/usr_123",
  "handle": "jane",
  "domain": "a.com",
  "displayName": "Jane Doe",
  "avatar": "https://cdn...",

  "updatedAt": "2025-03-01T12:00:00Z",
  "metadata": []
}
```

#### 5.1.2. UserAccount (private, not federated)

`UserAccount` is returned only to the authenticated user (e.g. via a `/me` endpoint). It may include provider-specific settings.

**UserAccount (example):**
```json
{
  "profile": {
    "id": "https://a.com/api/users/usr_123",
    "handle": "jane",
    "domain": "a.com",
    "displayName": "Jane Doe",
    "avatar": "https://cdn...",
    "updatedAt": "2025-03-01T12:00:00Z",
    "metadata": []
  },
  "settings": {
    "theme": "dark"
  }
}
```

### 5.3. Group & Channels
```json
{
  "id": "grp_1",
  "name": "Dev Guild",
  "owner": "usr_123@a.com",
  "permissions": {
    "post": ["member"],
    "moderate": ["admin"]
  },
  "channels": [
    {
      "id": "chn_general",
      "type": "text",
      "discoverability": "public",
      "tags": ["announcements"],
      "metadata": []
    },
    {
      "id": "chn_voice",
      "type": "call",
      "discoverability": "group",
      "call": {
        "active": false,
        "participants": []
      },
      "metadata": []
    }
  ]
}
```

### 5.3. Message Objects

**Chat**

Chats are intended for short, real-time communications between users.

```json
{
  "id": "msg_1",
  "author": "jane@a.com",
  "type": "message",
  "content": {
    "text": "Hello",
    "mime": "text/plain"
  },
  "attachments": [
    {
      "id": "att_1",
      "mime": "image/png",
      "url": "https://cdn...",
      "size": 2048
    }
  ],
  "reference": {
    "type": "reply",
    "id": "msg_parent"
  },
  "tags": ["#intro"],
  "createdAt": "2025-03-01T12:00:00Z",
  "permissions": {
    "editUntil": "2025-03-01T13:00:00Z"
  },
  "metadata": []
}
```

**Memo**

Memos are intended to be short-form posts similar to many social media platforms.

```json
{
  "id": "msg_2",
  "author": "jane@a.com",
  "type": "memo",
  "content": {
    "text": "Hi everyone...",
    "mime": "text/plain"
  },
  "attachments": [
    {
      "id": "att_1",
      "mime": "image/png",
      "url": "https://cdn...",
      "size": 2048
    }
  ],
  "reference": {
    "type": "reply",
    "id": "msg_parent"
  },
  "tags": ["#intro"],
  "createdAt": "2025-03-01T12:00:00Z",
  "permissions": {
    "editUntil": "2025-03-01T13:00:00Z"
  },
  "metadata": []
}
```

**Article**

Articles are intended to be long-form posts similar to what you might find on a blog or forum. They can be formatted with html or markdown, and are allowed to embed images or other remote content.

```json
{
  "id": "msg_3",
  "author": "jane@a.com",
  "type": "article",
  "content": {
    "text": "# Welcome to...",
    "mime": "text/markdown"
  },
  "attachments": [
    {
      "id": "att_1",
      "mime": "image/png",
      "url": "https://cdn...",
      "size": 2048
    }
  ],
  "reference": {
    "type": "reply",
    "id": "msg_parent"
  },
  "tags": ["#intro"],
  "createdAt": "2025-03-01T12:00:00Z",
  "permissions": {
    "editUntil": "2025-03-01T13:00:00Z"
  },
  "metadata": []
}
```

**Reaction**

Reactions allow users to interact with other message objects by adding a unicode character (usually an emoji), image, or GIF.

Clients **SHOULD** format reactions within their associated messages.

```json
{
  "id": "rct_1",
  "author": "jane@a.com",
  "key": "heart",
  "unicode": "❤️",
  "image": "https://cdn...",
  "reference": {
    "type": "message",
    "id": "msg_id"
  },
  "createdAt": "2025-03-01T12:00:00Z",
  "metadata": []
}
```

### 5.4. Metadata Objects

Metadata can be attached to most objects to implement custom features. Such features **MUST** provide a public JSON Schema and **MUST** be implemented in such a way that ignoring the metadata will still result in a readable experience.

```json
{
  "schema": "https://a.com/schemas/poll",
  "version": "1.0",
  "data": {
    "question": "lunch?",
    "options": ["tacos", "ramen"]
  }
}
```

---

## 6. User Privacy Endpoints (Profile, Presence, Membership Listing)

To support per-user privacy controls without overloading `UserProfile` fields, providers **MUST** implement the following endpoints.

### 6.1. Visibility policy (shared)

When a subject configures privacy for presence, profile extras (e.g. bio), or group memberships, providers **MUST** represent visibility using a small shared enum, with the values:

* `public` — visible to anyone
* `authenticated` — visible to any authenticated user
* `sharedGroups` — visible only to viewers who share at least one group with the subject
* `contacts` — visible only to DM contacts
* `nobody` — visible to no one except the subject (and administrators as required)

Providers **SHOULD** also implement an `allowList` and `denyList` that will override the privacy setting for users in these lists.

### 6.2. Public profile endpoint

```http
GET /api/users/{userRef}/profile
Authorization: Bearer <token>
```

**Response:** A `UserProfile` plus optional profile extras (such as `bio`) filtered by the subject’s profile visibility policy.

Example response:
```json
{
  "id": "https://a.com/api/users/usr_123",
  "handle": "jane",
  "domain": "a.com",
  "displayName": "Jane Doe",
  "avatar": "https://cdn...",
  "bio": "Hello!",
  "updatedAt": "2025-03-01T12:00:00Z",
  "metadata": []
}
```

### 6.3. Update my profile

```http
PATCH /api/me/profile
Authorization: Bearer <token>
Content-Type: application/json
```

Example request:
```json
{
  "displayName": "Jane Doe",
  "avatar": "https://cdn...",
  "bio": "Hello!",
  "metadata": []
}
```

### 6.4. Presence endpoint

```http
GET /api/users/{userRef}/presence
Authorization: Bearer <token>
```

Presence data returned **MUST** be filtered by the subject’s presence visibility policy.

Example response:
```json
{
  "availability": "online",
  "status": "Grinding @ work :/",
  "lastSeen": "2025-03-01T12:00:00Z",
  "metadata": []
}
```

Update my presence:
```http
PUT /api/me/presence
Authorization: Bearer <token>
Content-Type: application/json
```

Example request:
```json
{
  "availability": "away",
  "status": "On vacation, see ya! ;)",
  "metadata": []
}
```

### 6.5. Group memberships visible to viewer

```http
GET /api/users/{userRef}/groups
Authorization: Bearer <token>
```

Response **MUST** only include groups visible to the viewer per the subject’s membership visibility settings.

Example response:
```json
{
  "groups": [
    {
      "id": "https://a.com/api/groups/grp_1"
    }
  ],
  "metadata": []
}
```

### 6.6. Visibility settings (private)

Providers **SHOULD** allow users to configure visibility for presence, bio/profile extras, and membership listing.

```http
GET /api/me/privacy
Authorization: Bearer <token>
```

Example response:
```json
{
  "presenceVisibility": "sharedGroups",
  "profileVisibility": "public",
  "membershipVisibility": "contacts",
  "metadata": []
}
```

Update:
```http
PUT /api/me/privacy
Authorization: Bearer <token>
Content-Type: application/json
```

Example request:
```json
{
  "presenceVisibility": "sharedGroups",
  "profileVisibility": "public",
  "membershipVisibility": "contacts",
  "metadata": []
}
```

---

## 7. Messaging Lifecycle

### 7.1. WebSocket real-time messaging (Normative)

OFSCP standardizes real-time messaging over **WebSockets**.

Providers **MUST** expose a WebSocket endpoint at:

```
wss://{providerDomain}/api/ws
```

#### Authentication

Connections **MUST** be authenticated using a JWT access token.

* Clients **SHOULD** authenticate via the `Authorization: Bearer <token>` header during the WebSocket upgrade.
* If a client environment cannot set headers, providers **MAY** accept a `?access_token=<token>` query parameter.
  * This **MUST** only be accepted over TLS (`wss://`).

Providers **MUST** close the connection if authentication fails.

#### WebSocket message envelope

All client→server commands and server→client events **MUST** use this JSON envelope:

```json
{
  "id": "evt_or_cli_id",
  "type": "message.created",
  "ts": "2026-01-01T12:00:00Z",
  "correlationId": "optional_client_id",
  "data": {}
}
```

Rules:

* `id` **MUST** be unique within a connection.
* `type` **MUST** be a stable string.
* `ts` **MUST** be an RFC3339 timestamp.
* `correlationId` **SHOULD** be included in responses that correspond to a specific client request.

Clients **MUST** ignore unknown fields.

#### WebSocket message types (Normative)

All WebSocket payloads **MUST** use the message envelope described above.

The `type` field **MUST** be one of the following standardized strings.

##### Client → Server command types

| type | Description | data schema |
| --- | --- | --- |
| `subscribe` | Subscribe this connection to one or more channel streams. | `WsSubscribe` |
| `unsubscribe` | Unsubscribe this connection from one or more channel streams. | `WsUnsubscribe` |
| `message.create` | Create (post) a message into a channel timeline. | `WsMessageCreate` |
| `typing.start` | Signal typing started in a channel (ephemeral). | `WsTypingStart` |
| `typing.stop` | Signal typing stopped in a channel (ephemeral). | `WsTypingStop` |

##### Server → Client event types

| type | Description | data schema |
| --- | --- | --- |
| `subscribed` | Acknowledgement of a successful `subscribe`. | `WsSubscribed` |
| `unsubscribed` | Acknowledgement of a successful `unsubscribe`. | `WsUnsubscribed` |
| `message.created` | A message was created in a subscribed channel. | `WsMessageCreated` |
| `message.updated` | A message was updated in a subscribed channel. | `WsMessageUpdated` |
| `message.deleted` | A message was deleted in a subscribed channel. | `WsMessageDeleted` |
| `channel.typing` | Typing indicator event for a channel. | `WsChannelTyping` |
| `error` | Request-scoped error response. | `WsError` |

Rules:

* Providers **MUST** implement all event types listed above that correspond to the commands they support.
  * Example: a provider that supports `message.create` **MUST** emit `message.created`.
* Providers **MAY** emit additional `type` values; clients **MUST** ignore unknown types.
* For request/response style interactions (e.g. `subscribe`, `message.create`), providers **SHOULD** echo the client’s request `id` in `correlationId`.

#### Subscriptions

Clients **MUST** subscribe to one or more channels to receive message and typing events.

Client → Server:
```json
{
  "id": "cli_001",
  "type": "subscribe",
  "data": {
    "channels": ["chn_general"],
    "include": ["message.created", "message.updated", "message.deleted", "channel.typing"]
  }
}
```

Server → Client:
```json
{
  "id": "evt_100",
  "type": "subscribed",
  "correlationId": "cli_001",
  "ts": "2026-01-01T12:00:00Z",
  "data": { "channels": ["chn_general"] }
}
```

Providers **MUST** enforce authorization at subscription-time and reject unauthorized subscriptions.

Unsubscribe:
```json
{
  "id": "cli_002",
  "type": "unsubscribe",
  "data": { "channels": ["chn_general"] }
}
```

#### Sending messages

Posting a message is a WebSocket command.

Client → Server:
```json
{
  "id": "cli_200",
  "type": "message.create",
  "data": {
    "groupId": "grp_1",
    "channelId": "chn_general",
    "clientMessageId": "cmsg_abc123",
    "content": { "type": "text/plain", "text": "hi" }
  }
}
```

Server → Client event (fan-out to all subscribed clients, including the author):
```json
{
  "id": "evt_201",
  "type": "message.created",
  "correlationId": "cli_200",
  "ts": "2026-01-01T12:00:00Z",
  "data": {
    "groupId": "grp_1",
    "channelId": "chn_general",
    "message": {
      "id": "msg_999",
      "clientMessageId": "cmsg_abc123",
      "author": "user:alice",
      "createdAt": "2026-01-01T12:00:00Z",
      "content": { "type": "text/plain", "text": "hi" }
    }
  }
}
```

Idempotency:

* Clients **SHOULD** set `clientMessageId`.
* Providers **MUST** treat `(author, channelId, clientMessageId)` as idempotent and respond with the canonical message if a duplicate is received.

#### Typing indicators

Client → Server:
```json
{ "id": "cli_300", "type": "typing.start", "data": { "channelId": "chn_general" } }
```

Server → Subscribers:
```json
{
  "id": "evt_301",
  "type": "channel.typing",
  "ts": "2026-01-01T12:00:00Z",
  "data": { "channelId": "chn_general", "user": "user:alice", "state": "start" }
}
```

### 7.2. Reading

Pagination cursors **MUST** be opaque strings returned by the server.

```
GET /api/groups/{groupId}/channels/{channelId}/messages?cursor=opaqueCursorValue&direction=backward&limit=50
```

Response example:
```json
{
  "items": [],
  "page": {
    "nextCursor": "opaqueNextCursor",
    "prevCursor": "opaquePrevCursor"
  }
}
```

### 7.3. Error semantics

Providers **SHOULD** return errors using RFC 7807 Problem Details (`application/problem+json`) with stable `type` values.

Example:
```json
{
  "type": "https://ofscp.example/errors/invalid-payload",
  "title": "Invalid payload",
  "status": 400,
  "detail": "Field 'content.text' is required",
  "instance": "/api/groups/grp_1/channels/chn_general/messages"
}
```

Common status codes:

| Status | Meaning |
| --- | --- |
| 400 | Invalid payload/schema mismatch |
| 401 | Missing/invalid token |
| 403 | Permission denied |
| 404 | Channel or message not found |
| 409 | Duplicate client message ID |
| 503 | Provider temporarily unavailable |

#### WebSocket error messages

Providers **SHOULD** return errors as WebSocket messages with `type: "error"`.

Example:
```json
{
  "id": "evt_err_1",
  "type": "error",
  "correlationId": "cli_200",
  "ts": "2026-01-01T12:00:00Z",
  "data": {
    "code": "forbidden",
    "message": "No access to channel chn_general",
    "status": 403
  }
}
```

---

## 8. Federation Rules

### 8.0. Federation Request Authentication (Normative)

Federated (provider-to-provider) requests **MUST** be authenticated.

This specification standardizes on **HTTP Message Signatures (RFC 9421)** using **Ed25519**.

#### Key discovery and rotation

* Providers **MUST** publish one or more signing public keys in the discovery document `provider.publicKeys`.
* Each key **MUST** include a stable `kid`.
* Providers **SHOULD** overlap keys during rotation (publish old+new) for at least the maximum cache lifetime of discovery documents.
* On signature verification failure, recipients **SHOULD** re-fetch the sender's discovery document before rejecting.

#### Signature requirements

Federation requests **MUST** include:

* `Signature-Input` and `Signature` headers per RFC 9421
* A `Date` header (or `@created` component) and recipients **MUST** enforce a maximum clock skew (RECOMMENDED: 300 seconds)

The covered components **MUST** include:

* `@method`
* `@target-uri`
* `content-digest` (for requests with a body)
* `date` (or `@created`)

#### Replay prevention

Recipients **MUST** reject requests that are outside the allowed clock skew window.
Recipients **SHOULD** additionally implement replay detection for a short window (RECOMMENDED: 5 minutes), keyed by `(providerDomain, signature, @created)`.

#### Authorization

Authentication proves the calling provider domain; authorization is still required:

* Providers **MUST** apply allow/deny policy for which remote providers may federate.
* Providers **MUST** enforce channel/group privacy tiers when serving federation traffic.

### 8.1. Remote channel participation

* Remote users access a channel via `POST /api/groups/{groupId}/channels/{channelId}/join` on the channel’s home provider.
* Home provider authenticates the remote user by calling their home provider’s discovery document and verifying signed federation requests.

### 8.2. Direct messages

* **Source of Truth:** The recipient's home provider acts as the authoritative store for a user's inbox.
* **Client-to-Remote Delivery:** Clients **MUST** deliver DMs directly to the recipient's home provider via `POST /api/federation/dms/{dmId}/messages`.
* **Storage:** The recipient's provider stores the message.

### 8.3. Broadcast & discoverability

* Channels marked `discoverable` publish a feed at `GET /api/groups/{groupId}/channels/{channelId}/discoverable`. Remote providers subscribe using WebSub-like callbacks.
* Receiving providers decide whether to display, ignore, or re-rank discoverable content but **MUST** respect the channel’s privacy tier.

---

## 9. Real-time Calls

### 9.1. Call channel state

```json
{
  "channel": "chn_voice",
  "call": {
    "state": "inactive",
    "participants": [
      {
        "user": "jane@a.com",
        "role": "host",
        "media": {
          "audio": "opus",
          "video": "vp9"
        }
      }
    ],
    "metadata": []
  }
}
```

### 9.2. Control APIs (Signaling)

These endpoints act as the signaling plane. Payloads are ephemeral and not persisted in the channel timeline.

* `POST /api/groups/{groupId}/channels/{channelId}/call/offer` – client submits WebRTC offer SDP.
* `POST /api/groups/{groupId}/channels/{channelId}/call/answer` – provider validates and relays to other participants.
* `POST /api/groups/{groupId}/channels/{channelId}/call/ice` – trickle ICE exchange.
* Providers **MUST** ensure only one `active` session per call channel; attempts to start another result in **409**.

Consumers exchange media peer-to-peer; providers act as signaling coordinators only.

---

## 10. Notifications

Providers expose a webhook registration API:
```
POST /api/notifications/endpoints
{
  "type": "webpush",
  "target": "https://push-service",
  "events": ["message.created", "call.started"]
}
```

Delivery payload:
```json
{
  "event": "message.created",
  "resource": {
    "id": "msg_1",
    "channel": "chn_general"
  },
  "provider": "a.com",
  "signature": "base64"
}
```

---

## 11. Privacy & Discoverability Tiers

Privacy tiers are configured on a **per-channel** basis.

Providers **MAY** define their own set of privacy tiers to suit their community needs. However, all providers **MUST** support a `private` tier.

The following table lists **examples** of common configurations (non-normative suggestions):

| Tier | Description | Rules |
| --- | --- | --- |
| Private | Invite-only | No federation, no broadcast. |
| Group | Accessible to group members |  No federation, no broadcast. |
| Public | Visible to anyone with link | Read-only without join, but not broadcast. |
| Discoverable | Searchable and syndicated | Providers publish updates to subscribers. |

### 11.1. Tier Discovery

Providers **MUST** expose an endpoint (referenced in the discovery document) to list available tiers and their descriptions so clients can render them appropriately.

```
GET /api/tiers
```

**Response:**
```json
{
  "tiers": [
    {
      "id": "private",
      "name": "Private",
      "description": "Only invited members can see this channel."
    },
    {
      "id": "public",
      "name": "Public",
      "description": "Visible to anyone with the link."
    }
  ]
}
```

Clients **MUST** surface these tiers and allow owners to change them (subject to provider policy).

---

## 12. Compliance Checklist

### Provider **MUST**

- [ ] Serve `.well-known/ofscp-provider`
- [ ] Issue and validate JWT Bearer tokens for API authentication
- [ ] Publish JWT validation parameters via discovery (`issuer`, and `jwks_uri` for asymmetric signing)
- [ ] Support message fan-out + notification endpoints
- [ ] Enforce privacy tiers per channel
- [ ] Support 'private' channel tier
- [ ] Expose `GET /tiers` endpoint
- [ ] Provide metadata schema registry (optional entries allowed)

### Client **MUST**

- [ ] Support JWT Bearer authentication (`Authorization: Bearer <JWT>`)
- [ ] Support all message types or graceful fallback

### Client **SHOULD**

- [ ] Render metadata extensions when schemas known
- [ ] Provide UX for discoverability + privacy tiers
- [ ] Handle federation latency + retries

---

## 13. Future Work

* Rich moderation APIs (ban lists, reporting)
* Media relay + SFU guidelines for large calls
* Schema registry governance
* Interop test suite & conformance badges

Feedback welcome via issues or direct contact in the discovery document.
