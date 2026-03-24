'use strict';

const { Client, TopicMessageSubmitTransaction, AccountId, PrivateKey } = require('@hashgraph/sdk');

// ─── ONLY THE ADDRESSES FROM IEOS ────────────────────────────────────────────
const TOPIC_ID = '0.0.7564883';        // from ieos-boot-v3.js output
const OPERATOR_ID = '0.0.5772303';     // your funding account
const AGENT_DID = 'did:zpid:hedera:0.0.7564370';
const NFT_ID = '0.0.7564372';

// ─── EVERYTHING BELOW IS UNCHANGED FROM YOUR WORKING SCRIPT ───────────────────

let _seq = Date.now();
const nextId = (type) => `vmo:${type}:${_seq++}`;

function buildHederaClient() {
  const key = process.env.HEDERA_OPERATOR_KEY;
  if (!key) throw new Error('HEDERA_OPERATOR_KEY missing');
  const client = Client.forTestnet();
  client.setOperator(AccountId.fromString(OPERATOR_ID), PrivateKey.fromStringED25519(key));
  return client;
}

async function runOllama(prompt, systemPrompt = '') {
  const body = { model: 'llama3.2:1b', prompt, stream: false };
  if (systemPrompt) body.system = systemPrompt;
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Ollama error ${res.status}`);
  const data = await res.json();
  return data.response?.trim() ?? '';
}

function buildLogVMO(prompt, response) {
  const now = new Date().toISOString();
  return {
    vmo_id: nextId('log'),
    type: 'log',
    payload: { event: 'agent_inference', model: 'llama3.2:1b', prompt, response, timestamp: now },
    provenance: { agent_did: AGENT_DID, capability_id: null, timestamp: now },
    visibility: { scope: 'public', tags: ['agent', 'inference', 'log'] },
    lineage: { supersedes: [], conflicts_with: [] },
    hedera: { network: 'testnet', topic_id: TOPIC_ID, agent_id: '0.0.7564370', nft_id: NFT_ID, anchored: false, sequence: null },
    integrity: { content_hash: null, prev_hash: null, signature: null },
  };
}

async function sha256(str) {
  const { createHash } = await import('crypto');
  return 'sha256:' + createHash('sha256').update(str, 'utf8').digest('hex');
}

function signVMO(vmo, agentPrivKey) {
  const key = PrivateKey.fromStringED25519(agentPrivKey);
  const sig = key.sign(Buffer.from(JSON.stringify(vmo.payload), 'utf8'));
  return Buffer.from(sig).toString('hex');
}

async function anchorToHCS(client, vmo) {
  const envelope = {
    schema: 'zpid-vmo-log-v1',
    vmo_id: vmo.vmo_id,
    agent_did: vmo.provenance.agent_did,
    hash: vmo.integrity.content_hash,
    sig: vmo.integrity.signature,
    timestamp: vmo.provenance.timestamp,
  };
  const tx = await new TopicMessageSubmitTransaction().setTopicId(TOPIC_ID).setMessage(JSON.stringify(envelope)).execute(client);
  const receipt = await tx.getReceipt(client);
  return receipt.topicSequenceNumber?.toString() ?? null;
}

async function main() {
  const prompt = process.argv.slice(2).join(' ');
  if (!prompt) { console.error('Usage: node agent-wire.js "your prompt"'); process.exit(1); }

  const agentKey = process.env.HEDERA_AGENT_KEY;
  if (!agentKey) { console.error('HEDERA_AGENT_KEY missing'); process.exit(1); }

  console.log(`\n[agent-wire] Topic: ${TOPIC_ID}\n`);

  console.log('[1/4] Running inference...');
  const systemPrompt = `Your DID is ${AGENT_DID}. Be concise.`;
  const response = await runOllama(prompt, systemPrompt);
  console.log(`\nResponse:\n${response}\n`);

  console.log('[2/4] Building VMO...');
  const vmo = buildLogVMO(prompt, response);

  console.log('[3/4] Hashing and signing...');
  vmo.integrity.content_hash = await sha256(JSON.stringify(vmo.payload));
  vmo.integrity.signature = signVMO(vmo, agentKey);

  console.log('[4/4] Anchoring to Hedera...');
  const client = buildHederaClient();
  const seq = await anchorToHCS(client, vmo);
  client.close();

  vmo.hedera.anchored = true;
  vmo.hedera.sequence = seq;

  console.log(`\n✓ Complete. Sequence: ${seq}\n`);
  console.log(JSON.stringify(vmo, null, 2));
}

main().catch(err => { console.error(err.message); process.exit(1); });
