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
    'schemas/v0.1/defs/messaging.json'
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
    ['tests/privacy-settings.sample.json', 'schemas/v0.1/privacy-settings.json'],
    ['tests/message.sample.json', 'schemas/v0.1/message.json'],
    ['tests/reaction.sample.json', 'schemas/v0.1/reaction.json'],
    ['tests/messages-page.sample.json', 'schemas/v0.1/messages-page.json'],
    ['tests/problem-details.sample.json', 'schemas/v0.1/problem-details.json'],
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

    // WebSocket realtime messaging (v0.1)
    ['tests/ws-subscribe.sample.json', 'schemas/v0.1/ws/subscribe.json'],
    ['tests/ws-unsubscribe.sample.json', 'schemas/v0.1/ws/unsubscribe.json'],
    ['tests/ws-subscribed.sample.json', 'schemas/v0.1/ws/subscribed.json'],
    ['tests/ws-unsubscribed.sample.json', 'schemas/v0.1/ws/unsubscribed.json'],
    ['tests/ws-message-create.sample.json', 'schemas/v0.1/ws/message-create.json'],
    ['tests/ws-message-created.sample.json', 'schemas/v0.1/ws/message-created.json'],
    ['tests/ws-message-updated.sample.json', 'schemas/v0.1/ws/message-updated.json'],
    ['tests/ws-message-deleted.sample.json', 'schemas/v0.1/ws/message-deleted.json'],
    ['tests/ws-typing-start.sample.json', 'schemas/v0.1/ws/typing-start.json'],
    ['tests/ws-typing-stop.sample.json', 'schemas/v0.1/ws/typing-stop.json'],
    ['tests/ws-channel-typing.sample.json', 'schemas/v0.1/ws/channel-typing.json'],
    ['tests/ws-error.sample.json', 'schemas/v0.1/ws/error.json']
  ];

  for (const [samplePath, schemaPath] of cases) {
    const schema = await loadJson(schemaPath);
    const validate = await ajv.compileAsync(schema);
    const sample = await loadJson(samplePath);
    const ok = validate(sample);

    if (!ok) {
      console.error(`Validation failed: ${samplePath} against ${schemaPath}`);
      console.error(validate.errors);
      process.exitCode = 1;
      return;
    }

    console.log(`OK: ${path.basename(samplePath)} validates against ${path.basename(schemaPath)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
