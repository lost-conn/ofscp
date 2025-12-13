# Open Federated Social Communications Protocol (OFSCP)

> **Status:** Draft v0.1 (for implementation feedback)  
> **Audience:** Provider operators, client developers, interoperability testers  
> **Doc history:** Derived from OFSCP architectural diagrams, 2025-03



## 1. Goals & Scope

OFSCP defines an application-layer protocol that allows independently operated providers to offer a shared social + messaging experience. The specification focuses on:

* describing the HTTP APIs and payloads providers expose
* describing how clients authenticate, publish, subscribe, and call
* enabling federation between providers with consistent privacy models

Everything in this document uses RFC 2119 keywords (**MUST**, **SHOULD**, etc.).



## 2. Terminology

| Term | Description |
| --- | --- |
| **Provider** | A server (e.g., `example.com`) that stores user accounts, groups, channels, and delivers messages for its users. |
| **Client** | Any application acting on behalf of a user (mobile, desktop, bot, gateway). |
| **Group** | A community hosted on a provider that organizes channels and joined users. |
| **Channel** | Logical stream of posts/messages inside a group. |
| **Call Channel** | A channel that can host an active audio/video session. |
| **Home Provider** | Provider where a user account is registered. |
| **Remote Provider** | Other providers participating in federation for a channel, DM, or broadcast. |
| **Metadata Object** | Schema-described extension payload attached to base objects. |

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
    "version": "0.1",
    "publicKeys": [
      {
        "use": "sig",
        "alg": "ed25519",
        "key": "base64pubkey"
      }
    ],
    "contact": "mailto:admin@social.example",
    "authentication": {
      "issuer": "https://social.example",
      "authorization_endpoint": "https://social.example/oauth/authorize",
      "token_endpoint": "https://social.example/oauth/token",
      "userinfo_endpoint": "https://social.example/oauth/userinfo"
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
  },
  "endpoints": {
    "identity": "https://social.example/api/identity",
    "groups": "https://social.example/api/groups",
    "notifications": "https://social.example/api/notifications",
    "tiers": "https://social.example/api/tiers"
  }
}
```

Providers **MUST** include a monotonically increasing `version`. Clients **MAY** cache documents for up to 24 hours.

### 3.2. Provider Descriptor Schema

The discovery payload above is the canonical schema. Additional capability sections **MAY** be added, but unknown fields **MUST** be ignored by clients.

### 3.3. Provider Interconnection

Providers **MAY** maintain a list of "Known Providers" to facilitate federation. This list can optionally be populated via:
1.  **Manual Peering:** Administrators explicitly adding trusted domains.
2.  **Scraping:** Discovering user home domains from incoming cross-provider interactions.
3.  **Referral:** Querying other providers for their known peers.

---

## 4. Identity & Authentication

Clients use **OAuth 2.0** for session authentication (logging in).

### 4.1. Account Registration & Login

1.  **Discovery:** Client fetches the discovery document to find the `authentication` endpoints.
2.  **Authorization:** Client initiates an **OAuth 2.0 Authorization Code Flow** (PKCE recommended) by redirecting the user to `authorization_endpoint`.
    *   Scopes: `openid profile offline_access ofscp`
3.  **Token Exchange:** Client exchanges the code for an `access_token` and optional `refresh_token` at the `token_endpoint`.

### 4.2. Session Authentication

*   Clients **MUST** authenticate API requests using the `Authorization: Bearer <token>` header.
*   Providers **MUST** validate the token against the issued session.
*   If the token expires, clients **SHOULD** use the refresh token or re-authenticate.


### 4.3. Federated User Lookup

When a remote provider needs to verify a user:

```http
GET /api/identity/users/{handle}@{home}
Headers: X-OFSCP-Provider: {requester-domain}
```

Response:
```json
{
  "id": "usr_123",
  "handle": "jane",
  "home": "a.com",
  "updatedAt": "2025-03-01T12:00:00Z"
}
```

Remote providers **MUST** cache user info and respect `updatedAt` for invalidation.

---

## 5. Data Models

### 5.1. User
```json
{
  "id": "usr_123",
  "handle": "jane",
  "home": "a.com",
  "displayName": "Jane Doe",
  "avatar": "https://cdn...",
  "presence": {
    "availability": "online",
    "status": "text"
  },
  "bio": "text",
  "groups": ["https://a.com/grp_1"],
  "settings": {"theme": "dark"},
  "notificationEndpoints": [
    {
      "type": "webhook",
      "url": "https://client/push"
    }
  ]
}
```

### 5.2. Group & Channels
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
      "metadata": {}
    },
    {
      "id": "chn_voice",
      "type": "call",
      "discoverability": "group",
      "call": {
        "active": false,
        "participants": []
      }
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
    "text": "Hello"
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
    "editUntil": "2025-03-01T13:00Z"
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
    "text": "Hi everyone..."
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
    "editUntil": "2025-03-01T13:00Z"
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
    "mime": "text/markdown" // Or text/html
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
    "editUntil": "2025-03-01T13:00Z"
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
  // Definitiosn are used for grouping reactions. A reaction with no image can simply use the unicode as a definition.
  "definition": "reaction@a.com",
  "unicode": "<3",
  "desctription": "heart",
  "image": "https://cdn...", // Can be an image or GIF
  "reference": "msg_id",
  "metadata": []
}
```

### 5.4. Metadata Objects

Metadata can be attached to most objects to implement custom features. Such features **MUST** provide a public JSON Schema and **MUST** be implemented in such a way that ignoring the metadata will still result in a readable experience.

```json
{
  "schema": "https://a.com/schemas/poll",
  "version": "1.0",
  "data": { // Data can be anything
    "question": "lunch?",
    "options": ["tacos", "ramen"]
  }
}
```

---

## 6. Messaging Lifecycle

### 6.1. Posting

```
POST /api/groups/{groupId}/channels/{channelId}/messages
Authorization: Bearer {token}
Idempotency-Key: {uuid}
Body: message object
```

Provider flow:
1. Validate permissions → reject with **403** if the user lacks access.
2. Persist the message into the channel timeline.
3. Fan-out to:
   * Local followers/subscribers
   * Remote providers subscribed to the channel
   * User notification endpoints
   * Optional push/webhook integrations

### 6.2. Reading

```
GET /api/groups/{groupId}/channels/{channelId}/messages?cursor=msg_20&direction=backward&limit=50
```
Responses include pagination cursors and aggregated reactions.

### 6.3. Error semantics

| Status | Meaning |
| --- | --- |
| 400 | Invalid payload/schema mismatch |
| 401 | Missing/invalid token |
| 403 | Permission denied |
| 404 | Channel or message not found |
| 409 | Duplicate client message ID |
| 503 | Provider temporarily unavailable |

### 6.4. Real-time Updates

To receive new messages without polling, clients **SHOULD** connect to the event stream:

```
GET /api/events?channels=chn_general,chn_voice
Accept: text/event-stream
```

Events are pushed as Server-Sent Events (SSE):
* `message.created`
* `message.updated`
* `channel.typing`

---

## 7. Federation Rules

### 7.1. Remote channel participation

* Remote users access a channel via `POST /api/groups/{groupId}/channels/{channelId}/join` on the channel’s home provider.
* Home provider authenticates the remote user by calling their home provider’s key endpoint.

### 7.2. Direct messages

* **Source of Truth:** The recipient's home provider acts as the authoritative store for a user's inbox.
* **Client-to-Remote Delivery:** Clients **MUST** deliver DMs directly to the recipient's home provider via `POST /api/federation/dms/{dmId}/messages`.
* **Storage:** The recipient's provider stores the message.


### 7.3. Broadcast & discoverability

* Channels marked `discoverable` publish a feed at `GET /api/groups/{groupId}/channels/{channelId}/discoverable`. Remote providers subscribe using WebSub-like callbacks.
* Receiving providers decide whether to display, ignore, or re-rank discoverable content but **MUST** respect the channel’s privacy tier.

---

## 8. Real-time Calls

### 8.1. Call channel state

```json
{
  "channel": "chn_voice",
  "call": {
    "state": "inactive", // inactive | ringing | active
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
    "metadata": {}
  }
}
```

### 8.2. Control APIs (Signaling)

These endpoints act as the signaling plane. Payloads are ephemeral and not persisted in the channel timeline.

* `POST /api/groups/{groupId}/channels/{channelId}/call/offer` – client submits WebRTC offer SDP.
* `POST /api/groups/{groupId}/channels/{channelId}/call/answer` – provider validates and relays to other participants.
* `POST /api/groups/{groupId}/channels/{channelId}/call/ice` – trickle ICE exchange.
* Providers **MUST** ensure only one `active` session per call channel; attempts to start another result in **409**.

Consumers exchange media peer-to-peer; providers act as signaling coordinators only.

---



---

## 9. Notifications

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

## 10. Privacy & Discoverability Tiers

Privacy tiers are configured on a **per-channel** basis.

Providers **MAY** define their own set of privacy tiers to suit their community needs. However, all providers **MUST** support a `private` tier.

The following table lists **examples** of common configurations (non-normative suggestions):

| Tier | Description | Rules |
| --- | --- | --- |
| Private | Invite-only | No federation, no broadcast. |
| Group | Accessible to group members |  No federation, no broadcast. |
| Public | Visible to anyone with link | Read-only without join, but not broadcast. |
| Discoverable | Searchable and syndicated | Providers publish updates to subscribers. |

### 10.1. Tier Discovery

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

## 11. Compliance Checklist

### Provider **MUST**

- [ ] Serve `.well-known/ofscp-provider`
- [ ] Support OAuth 2.0 OIDC flows

- [ ] Support message fan-out + notification endpoints
- [ ] Enforce privacy tiers per channel
- [ ] Support 'private' channel tier
- [ ] Expose `GET /tiers` endpoint
- [ ] Provide metadata schema registry (optional entries allowed)

### Client **MUST**

- [ ] Support OAuth 2.0 authentication

- [ ] Support all message types or graceful fallback

### Client **SHOULD**

- [ ] Render metadata extensions when schemas known
- [ ] Provide UX for discoverability + privacy tiers
- [ ] Handle federation latency + retries

---

## 12. Future Work

* Rich moderation APIs (ban lists, reporting)
* Media relay + SFU guidelines for large calls
* Schema registry governance
* Interop test suite & conformance badges

Feedback welcome via issues or direct contact in the discovery document.
