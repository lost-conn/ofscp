import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const repoRoot = process.cwd();

function repoPath(p) {
  return path.join(repoRoot, p);
}

// Minimal local resolver for our repo-relative $refs (e.g. "./defs/common.json#/$defs/uri")
async function loadJson(relPath) {
  const txt = await fs.readFile(repoPath(relPath), 'utf8');
  return JSON.parse(txt);
}

const ajv = new Ajv({
  strict: false,
  allErrors: true,
  loadSchema: async (uri) => {
    // Ajv calls this with the $ref string.
    // We only support repo-relative refs used in these schemas.
    const clean = uri.split('#')[0];
    if (clean.startsWith('./')) {
      const target = clean.replace(/^\.\//, 'schemas/v0.1/');
      return loadJson(target);
    }
    if (clean.includes('/schemas/v0.1/')) {
      // handle absolute IDs if user replaced example.invalid
      const idx = clean.indexOf('/schemas/v0.1/');
      const target = 'schemas/v0.1/' + clean.slice(idx + '/schemas/v0.1/'.length);
      return loadJson(target);
    }
    throw new Error(`Unsupported $ref for test runner: ${uri}`);
  }
});

addFormats(ajv);

async function preloadDefs() {
  for (const defPath of [
    'schemas/v0.1/defs/common.json',
    'schemas/v0.1/defs/objects.json',
    'schemas/v0.1/defs/identity.json',
    'schemas/v0.1/defs/privacy.json',
    'schemas/v0.1/defs/messaging.json',
    'schemas/v0.1/defs/groups.json'
  ]) {
    ajv.addSchema(await loadJson(defPath));
  }
}

async function main() {
  await preloadDefs();

  const cases = [
    ['tests/provider-discovery.sample.json', 'schemas/v0.1/provider-discovery.json'],
    ['tests/user-profile.sample.json', 'schemas/v0.1/user-profile.json'],
    ['tests/presence.sample.json', 'schemas/v0.1/presence.json'],
    ['tests/presence-update-request.sample.json', 'schemas/v0.1/presence-update-request.json'],
    ['tests/privacy-settings.sample.json', 'schemas/v0.1/privacy-settings.json'],
    ['tests/privacy-settings-update-request.sample.json', 'schemas/v0.1/privacy-settings-update-request.json'],
    ['tests/group.sample.json', 'schemas/v0.1/group.json'],
    ['tests/group-membership.sample.json', 'schemas/v0.1/group.json'],
    ['tests/channel.sample.json', 'schemas/v0.1/channel.json'],
    ['tests/channel-list.sample.json', 'schemas/v0.1/channel-list.json'],
    ['tests/reaction-put-request.sample.json', 'schemas/v0.1/reaction-put-request.json'],
    ['tests/reaction-put-request.empty.sample.json', 'schemas/v0.1/reaction-put-request.json'],
    ['tests/group-create-request.sample.json', 'schemas/v0.1/group-create-request.json'],
    ['tests/group-update-request.sample.json', 'schemas/v0.1/group-update-request.json'],
    ['tests/channel-create-request.sample.json', 'schemas/v0.1/channel-create-request.json'],
    ['tests/channel-update-request.sample.json', 'schemas/v0.1/channel-update-request.json'],
    ['tests/invite.sample.json', 'schemas/v0.1/invite.json'],
    ['tests/invites-page.sample.json', 'schemas/v0.1/invites-page.json'],
    ['tests/invite-create-request.sample.json', 'schemas/v0.1/invite-create-request.json'],
    ['tests/guest-create-request.sample.json', 'schemas/v0.1/guest-create-request.json'],
    ['tests/member.sample.json', 'schemas/v0.1/member.json'],
    ['tests/join-request.sample.json', 'schemas/v0.1/join-request.json'],
    ['tests/join-requests-page.sample.json', 'schemas/v0.1/join-requests-page.json'],
    ['tests/join-create-request.sample.json', 'schemas/v0.1/join-create-request.json'],
    ['tests/join-create-request.empty.sample.json', 'schemas/v0.1/join-create-request.json'],
    ['tests/message.sample.json', 'schemas/v0.1/message.json'],
    ['tests/message-article.sample.json', 'schemas/v0.1/message.json'],
    ['tests/message-create-request.sample.json', 'schemas/v0.1/message-create-request.json'],
    ['tests/message-update-request.sample.json', 'schemas/v0.1/message-update-request.json'],
    ['tests/message-update-article-request.sample.json', 'schemas/v0.1/message-update-request.json'],
    ['tests/attachment.sample.json', 'schemas/v0.1/attachment.json'],
    ['tests/attachment-video.sample.json', 'schemas/v0.1/attachment.json'],
    ['tests/reaction.sample.json', 'schemas/v0.1/reaction.json'],
    ['tests/messages-page.sample.json', 'schemas/v0.1/messages-page.json'],
    ['tests/problem-details.sample.json', 'schemas/v0.1/problem-details.json'],

    // Contacts (§6.7)
    ['tests/contact.sample.json', 'schemas/v0.1/contact.json'],
    ['tests/contact-create-request.sample.json', 'schemas/v0.1/contact-create-request.json'],
    ['tests/contacts-response.sample.json', 'schemas/v0.1/contacts-response.json'],
    ['tests/contact-event.sample.json', 'schemas/v0.1/contact-event.json'],

    // Direct messages (§7.4)
    ['tests/dm-conversation.sample.json', 'schemas/v0.1/dm-conversation.json'],
    ['tests/dm-conversations-response.sample.json', 'schemas/v0.1/dm-conversations-response.json'],
    ['tests/dm-message-create-request.sample.json', 'schemas/v0.1/dm-message-create-request.json'],
    ['tests/ws-dm-message.sample.json', 'schemas/v0.1/ws/dm-message.json'],
    ['tests/ws-dm-reaction.sample.json', 'schemas/v0.1/ws/dm-reaction.json'],
    ['tests/ws-dm-typing.sample.json', 'schemas/v0.1/ws/dm-typing.json'],

    // Follows & home feed (§7.6)
    ['tests/follow.sample.json', 'schemas/v0.1/follow.json'],
    ['tests/follow-create-request.sample.json', 'schemas/v0.1/follow-create-request.json'],
    ['tests/follows-response.sample.json', 'schemas/v0.1/follows-response.json'],

    // Group list & membership pointers (§5.7)
    ['tests/group-pointer.sample.json', 'schemas/v0.1/group-pointer.json'],
    ['tests/group-pointer-request.sample.json', 'schemas/v0.1/group-pointer-request.json'],
    ['tests/group-pointers-response.sample.json', 'schemas/v0.1/group-pointers-response.json'],
    ['tests/ws-groups-updated.sample.json', 'schemas/v0.1/ws/groups-updated.json'],

    // Cross-provider discovery (§8.6, §11.2)
    ['tests/providers-response.sample.json', 'schemas/v0.1/providers-response.json'],
    ['tests/discover-response.sample.json', 'schemas/v0.1/discover-response.json'],
    ['tests/tiers-response.sample.json', 'schemas/v0.1/tiers-response.json'],
    [
      'tests/notifications-webhook-registration.sample.json',
      'schemas/v0.1/notifications-webhook-registration.json'
    ],
    ['tests/notifications-delivery.sample.json', 'schemas/v0.1/notifications-delivery.json'],
    ['tests/call-channel-state.sample.json', 'schemas/v0.1/call-channel-state.json'],
    ['tests/call-offer.sample.json', 'schemas/v0.1/call-offer.json'],
    ['tests/call-answer.sample.json', 'schemas/v0.1/call-answer.json'],
    ['tests/call-ice.sample.json', 'schemas/v0.1/call-ice.json'],
    ['tests/call-session.sample.json', 'schemas/v0.1/call-session.json'],
    ['tests/ws-call-started.sample.json', 'schemas/v0.1/ws/call-started.json'],
    ['tests/ws-call-ended.sample.json', 'schemas/v0.1/ws/call-ended.json'],
    ['tests/ws-call-participant.sample.json', 'schemas/v0.1/ws/call-participant.json'],

    // WebSocket realtime messaging (v0.1)
    ['tests/ws-auth-challenge.sample.json', 'schemas/v0.1/ws/auth-challenge.json'],
    ['tests/ws-authenticate.sample.json', 'schemas/v0.1/ws/authenticate.json'],
    ['tests/ws-authenticated.sample.json', 'schemas/v0.1/ws/authenticated.json'],
    ['tests/ws-subscribe.sample.json', 'schemas/v0.1/ws/subscribe.json'],
    ['tests/ws-unsubscribe.sample.json', 'schemas/v0.1/ws/unsubscribe.json'],
    ['tests/ws-subscribed.sample.json', 'schemas/v0.1/ws/subscribed.json'],
    ['tests/ws-unsubscribed.sample.json', 'schemas/v0.1/ws/unsubscribed.json'],
    ['tests/ws-unsubscribed-revoked.sample.json', 'schemas/v0.1/ws/unsubscribed.json'],
    ['tests/ws-message-create.sample.json', 'schemas/v0.1/ws/message-create.json'],
    ['tests/ws-message-update.sample.json', 'schemas/v0.1/ws/message-update.json'],
    ['tests/ws-message-update-article.sample.json', 'schemas/v0.1/ws/message-update.json'],
    ['tests/ws-message-delete.sample.json', 'schemas/v0.1/ws/message-delete.json'],
    ['tests/ws-message-created.sample.json', 'schemas/v0.1/ws/message-created.json'],
    ['tests/ws-message-updated.sample.json', 'schemas/v0.1/ws/message-updated.json'],
    ['tests/ws-message-deleted.sample.json', 'schemas/v0.1/ws/message-deleted.json'],
    ['tests/ws-typing-start.sample.json', 'schemas/v0.1/ws/typing-start.json'],
    ['tests/ws-typing-stop.sample.json', 'schemas/v0.1/ws/typing-stop.json'],
    ['tests/ws-channel-typing.sample.json', 'schemas/v0.1/ws/channel-typing.json'],
    ['tests/ws-reaction-add.sample.json', 'schemas/v0.1/ws/reaction-add.json'],
    ['tests/ws-reaction-remove.sample.json', 'schemas/v0.1/ws/reaction-remove.json'],
    ['tests/ws-reaction-added.sample.json', 'schemas/v0.1/ws/reaction-added.json'],
    ['tests/ws-reaction-removed.sample.json', 'schemas/v0.1/ws/reaction-removed.json'],
    ['tests/ws-presence-subscribe.sample.json', 'schemas/v0.1/ws/presence-subscribe.json'],
    ['tests/ws-presence-unsubscribe.sample.json', 'schemas/v0.1/ws/presence-unsubscribe.json'],
    ['tests/ws-presence-subscribed.sample.json', 'schemas/v0.1/ws/presence-subscribed.json'],
    ['tests/ws-presence-unsubscribed.sample.json', 'schemas/v0.1/ws/presence-unsubscribed.json'],
    ['tests/ws-presence-set.sample.json', 'schemas/v0.1/ws/presence-set.json'],
    ['tests/ws-presence-update.sample.json', 'schemas/v0.1/ws/presence-update.json'],
    ['tests/ws-ping.sample.json', 'schemas/v0.1/ws/ping.json'],
    ['tests/ws-pong.sample.json', 'schemas/v0.1/ws/pong.json'],
    ['tests/ws-error.sample.json', 'schemas/v0.1/ws/error.json'],
    // §7.1 partial subscribe: the refused channel ids ride in details.channels.
    ['tests/ws-error-subscribe-partial.sample.json', 'schemas/v0.1/ws/error.json'],
    // §7.1 envelope: a command's `ts` is optional and its value ignored.
    ['tests/ws-command-ts-ignored.sample.json', 'schemas/v0.1/ws/typing-stop.json'],

    // Authentication & Device Keys
    ['tests/auth-registration-request.sample.json', 'schemas/v0.1/auth-registration-request.json'],
    ['tests/auth-login-request.sample.json', 'schemas/v0.1/auth-login-request.json'],
    ['tests/auth-bootstrap-response.sample.json', 'schemas/v0.1/auth-bootstrap-response.json'],
    ['tests/device-key-registration.sample.json', 'schemas/v0.1/device-key-registration.json'],
    ['tests/device-key-response.sample.json', 'schemas/v0.1/device-key-response.json'],
    ['tests/user-keys-response.sample.json', 'schemas/v0.1/user-keys-response.json'],
    ['tests/device-keys-response.sample.json', 'schemas/v0.1/device-keys-response.json'],
    ['tests/notifications-endpoints-response.sample.json', 'schemas/v0.1/notifications-endpoints-response.json'],
    ['tests/guest-claim-request.sample.json', 'schemas/v0.1/guest-claim-request.json'],
    ['tests/notification.sample.json', 'schemas/v0.1/notification.json'],
    ['tests/notifications-response.sample.json', 'schemas/v0.1/notifications-response.json'],
    ['tests/notifications-mark-response.sample.json', 'schemas/v0.1/notifications-mark-response.json'],
    ['tests/notification-setting.sample.json', 'schemas/v0.1/notification-setting.json'],
    ['tests/notification-settings-response.sample.json', 'schemas/v0.1/notification-settings-response.json'],
    ['tests/push-subscribe-request.sample.json', 'schemas/v0.1/push-subscribe-request.json'],
    ['tests/push-public-key-response.sample.json', 'schemas/v0.1/push-public-key-response.json'],
    ['tests/push-payload.sample.json', 'schemas/v0.1/push-payload.json'],
    ['tests/guest-upgrade-response.sample.json', 'schemas/v0.1/guest-upgrade-response.json'],
    ['tests/ws-member-updated.sample.json', 'schemas/v0.1/ws/member-updated.json'],
    ['tests/ws-notification-created.sample.json', 'schemas/v0.1/ws/notification-created.json'],
    ['tests/read-markers-response.sample.json', 'schemas/v0.1/read-markers-response.json'],
    ['tests/read-markers-update-request.sample.json', 'schemas/v0.1/read-markers-update-request.json'],
    ['tests/ws-read-updated.sample.json', 'schemas/v0.1/ws/read-updated.json'],
    ['tests/dm-conversation-pointer-request.sample.json', 'schemas/v0.1/dm-conversation-pointer-request.json'],
    ['tests/ws-dm-conversation.sample.json', 'schemas/v0.1/ws/dm-conversation.json']
  ];

  for (const [samplePath, schemaPath] of cases) {
    const schema = await loadJson(schemaPath);
    const validate = ajv.getSchema(schema.$id) ?? (await ajv.compileAsync(schema));
    const sample = await loadJson(samplePath);
    const ok = validate(sample);

    if (!ok) {
      console.error(`Validation failed: ${samplePath} against ${schemaPath}`);
      console.error(validate.errors);
      process.exitCode = 1;
      continue;
    }

    console.log(`OK: ${path.basename(samplePath)} validates against ${path.basename(schemaPath)}`);
  }

  // Samples a schema MUST reject: each pins a rule the spec states as
  // normative, so loosening the schema fails the suite.
  const rejectCases = [
    // §6.4 / §7.5: `offline` is connection-derived, never settable.
    ['tests/presence-update-request.offline.invalid.json', 'schemas/v0.1/presence-update-request.json'],
    // §7.1 envelope: `ts` is required on server→client events,
    ['tests/ws-subscribed.no-ts.invalid.json', 'schemas/v0.1/ws/subscribed.json'],
    // `id` on every command,
    ['tests/ws-subscribe.no-id.invalid.json', 'schemas/v0.1/ws/subscribe.json'],
    // and `data` is always an object.
    ['tests/ws-ping.data-not-object.invalid.json', 'schemas/v0.1/ws/ping.json'],
    // §4.3.2: `public_key` is the raw 32-byte key, not a DER SubjectPublicKeyInfo.
    ['tests/device-key-registration.spki.invalid.json', 'schemas/v0.1/device-key-registration.json'],
    // §7.1: a reaction `image` is an https URL.
    ['tests/reaction-put-request.http-image.invalid.json', 'schemas/v0.1/reaction-put-request.json'],
    // §5.7: a join body's `message` is a string, never null.
    ['tests/join-create-request.null-message.invalid.json', 'schemas/v0.1/join-create-request.json']
  ];

  for (const [samplePath, schemaPath] of rejectCases) {
    const schema = await loadJson(schemaPath);
    const validate = ajv.getSchema(schema.$id) ?? (await ajv.compileAsync(schema));
    const sample = await loadJson(samplePath);

    if (validate(sample)) {
      console.error(`Expected rejection: ${samplePath} unexpectedly validates against ${schemaPath}`);
      process.exitCode = 1;
      continue;
    }

    console.log(`OK: ${path.basename(samplePath)} is rejected by ${path.basename(schemaPath)}`);
  }

  // §4.3.2: an unusable published key is ignored on its own. A keys response
  // or discovery document carrying, beside a good key, a key that does not
  // decode to 32 bytes and a key of an algorithm v0.1 does not define stays
  // schema-valid, so tightening these schemas back fails the suite. Derived
  // from the existing samples, so no extra sample file is needed.
  const unusableKeys = [
    {
      key_id: 'dk_short',
      algorithm: 'Ed25519',
      // 33 bytes, base64: not a raw Ed25519 key.
      public_key: 'AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8g',
      created_at: '2026-01-11T09:30:00Z'
    },
    {
      key_id: 'dk_future',
      algorithm: 'Ed448',
      public_key: 'not-an-ed25519-key',
      created_at: '2026-01-11T09:30:00Z'
    }
  ];
  const perKeyCases = [
    ['tests/user-keys-response.sample.json', 'schemas/v0.1/user-keys-response.json', (doc) => doc.keys],
    ['tests/provider-discovery.sample.json', 'schemas/v0.1/provider-discovery.json', (doc) => doc.provider.publicKeys]
  ];
  for (const [samplePath, schemaPath, keysOf] of perKeyCases) {
    const schema = await loadJson(schemaPath);
    const validate = ajv.getSchema(schema.$id) ?? (await ajv.compileAsync(schema));
    const doc = await loadJson(samplePath);
    keysOf(doc).push(...structuredClone(unusableKeys));
    if (!validate(doc)) {
      console.error(`Validation failed: ${samplePath} with unusable keys added against ${schemaPath}`);
      console.error(validate.errors);
      process.exitCode = 1;
      continue;
    }
    console.log(`OK: ${path.basename(samplePath)} with unusable keys added validates against ${path.basename(schemaPath)}`);
  }

  // §7.2 / §7.4: a reply's parent is (provider, id). A reference carrying a
  // canonical `provider` authority validates; a provider spelled as a URL, with
  // uppercase letters, or empty is rejected. Derived from the existing samples,
  // so no extra sample file is needed.
  const referenceCases = [
    ['tests/dm-message-create-request.sample.json', 'schemas/v0.1/dm-message-create-request.json'],
    ['tests/message-create-request.sample.json', 'schemas/v0.1/message-create-request.json']
  ];
  const goodProviders = ['a.com', 'chat.example.org:8443', 'xn--bcher-kva.example'];
  const badProviders = ['https://a.com', 'A.com', 'a.com/', '', 'a.com:'];
  for (const [samplePath, schemaPath] of referenceCases) {
    const schema = await loadJson(schemaPath);
    const validate = ajv.getSchema(schema.$id) ?? (await ajv.compileAsync(schema));
    const base = await loadJson(samplePath);
    for (const provider of goodProviders) {
      const doc = { ...structuredClone(base), reference: { type: 'reply', id: 'msg_1', provider } };
      if (!validate(doc)) {
        console.error(`Validation failed: ${samplePath} with reference.provider ${JSON.stringify(provider)} against ${schemaPath}`);
        console.error(validate.errors);
        process.exitCode = 1;
        continue;
      }
      console.log(`OK: ${path.basename(samplePath)} with reference.provider ${JSON.stringify(provider)} validates against ${path.basename(schemaPath)}`);
    }
    for (const provider of badProviders) {
      const doc = { ...structuredClone(base), reference: { type: 'reply', id: 'msg_1', provider } };
      if (validate(doc)) {
        console.error(`Expected rejection: ${samplePath} with reference.provider ${JSON.stringify(provider)} unexpectedly validates against ${schemaPath}`);
        process.exitCode = 1;
        continue;
      }
      console.log(`OK: ${path.basename(samplePath)} with reference.provider ${JSON.stringify(provider)} is rejected by ${path.basename(schemaPath)}`);
    }
  }

  // §7.2: channel history and replies hold messages only. A page carrying a
  // Reaction (built from tests/reaction.sample.json) beside its message MUST
  // be rejected, so widening TimelineItem back to a union fails the suite.
  {
    const schemaPath = 'schemas/v0.1/messages-page.json';
    const schema = await loadJson(schemaPath);
    const validate = ajv.getSchema(schema.$id) ?? (await ajv.compileAsync(schema));
    const page = await loadJson('tests/messages-page.sample.json');
    page.items.push(await loadJson('tests/reaction.sample.json'));
    if (validate(page)) {
      console.error(`Expected rejection: messages-page.sample.json with a Reaction item unexpectedly validates against ${schemaPath}`);
      process.exitCode = 1;
    } else {
      console.log('OK: messages-page.sample.json with a Reaction item is rejected by messages-page.json');
    }
  }

  // §5.6: an invite token is a bearer secret. The creation response MUST
  // carry it; any other Invite may omit it. Built from tests/invite.sample.json,
  // so no extra sample file is needed.
  {
    const inviteSchema = await loadJson('schemas/v0.1/invite.json');
    const validateInvite = ajv.getSchema(inviteSchema.$id) ?? (await ajv.compileAsync(inviteSchema));
    const createSchema = await loadJson('schemas/v0.1/invite-create-response.json');
    const validateCreated = ajv.getSchema(createSchema.$id) ?? (await ajv.compileAsync(createSchema));
    const invite = await loadJson('tests/invite.sample.json');
    const { token: _token, ...tokenless } = invite;

    if (!validateCreated(invite)) {
      console.error('Validation failed: invite.sample.json against invite-create-response.json');
      console.error(validateCreated.errors);
      process.exitCode = 1;
    } else {
      console.log('OK: invite.sample.json validates against invite-create-response.json');
    }
    if (!validateInvite(tokenless)) {
      console.error('Validation failed: invite.sample.json without token against invite.json');
      console.error(validateInvite.errors);
      process.exitCode = 1;
    } else {
      console.log('OK: invite.sample.json without token validates against invite.json');
    }
    if (validateCreated(tokenless)) {
      console.error('Expected rejection: invite.sample.json without token unexpectedly validates against invite-create-response.json');
      process.exitCode = 1;
    } else {
      console.log('OK: invite.sample.json without token is rejected by invite-create-response.json');
    }
  }

  // The request-signing vector (§4.4.3) signs a POST that creates a channel
  // message (§7.1); its body must be a valid message-create request.
  const vector = await loadJson('tests/signing-vector.json');
  const createSchema = await loadJson('schemas/v0.1/message-create-request.json');
  const validateCreate = ajv.getSchema(createSchema.$id) ?? (await ajv.compileAsync(createSchema));
  if (!validateCreate(JSON.parse(vector.request.body))) {
    console.error('Validation failed: signing-vector.json request.body against message-create-request.json');
    console.error(validateCreate.errors);
    process.exitCode = 1;
  } else {
    console.log('OK: signing-vector.json request.body validates against message-create-request.json');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
