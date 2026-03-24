# Sovereign Claim Verification Rail

**hhtps:// + MintMark + Hedera HCS**

A protocol for verifiable, self-authenticating claims. No third party. No permission. Just the ledger and the link.

---

## What It Does

- Creates **MintMark tokens** that embed `hhtps://` URIs
- Each URI resolves to a **hash on Hedera** (topic message)
- The hash verifies against **raw data stored anywhere** (IPFS, Solid pod, local drive)
- QR‑scannable loop: scan → resolve → verify → done

**Use cases:** carbon credits, AI provenance, legal filings, credentials, property deeds — any claim that needs to be verified without asking permission.

---

## Prior Art (Anchored on Hedera)

| Asset | ID | Date |
|-------|----|------|
| Sovereign Capsule | `0.0.7564185` | March 2024 |
| Heartbeat Topic | `0.0.7564883` | March 2024 |

These anchors **predate** Prove AI, Hedera Guardian, and similar verification systems by over a year.

---

## How It Works

1. **Create a claim** (raw data, stored anywhere you control)
2. **Hash the claim** → post hash to Hedera topic
3. **Mint a MintMark** containing the `hhtps://` URI that points to that topic message
4. **Scan the MintMark** → URI resolves to hash → hash verifies raw data

No app required. No third‑party API. Just the ledger and a resolver.

---

## Repository Contents

| File | Purpose |
|------|---------|
| `agent-wire.js` | Local AI agent that wraps outputs as VMOs and anchors to Hedera |
| `run_v2.js` | CLI to mint MintMarks and anchor to Hedera |
| `hedera_bridge_v2.js` | Bridges MintMarks to Hedera HCS |
| `newRule.js` | Anchors ethics rules to the heartbeat topic |
| `ieos-boot-v3.js` | Sovereign kernel boot sequence (reads capsule, syncs topic) |

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/capn1derfl/sovereign-claim-rail
cd sovereign-claim-rail

# Install dependencies
npm install

# Set up your .env file (see .env.example)
cp .env.example .env

# Boot the kernel
node ieos-boot-v3.js

# Mint a MintMark
node run_v2.js mint "Your claim here"

# Anchor an ethics rule
node newRule.js
