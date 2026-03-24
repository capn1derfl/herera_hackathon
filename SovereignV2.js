// SovereignV2.js
// Sovereign Kernel v2.0.0 — full file, complete, with automatic persistence.

const fs = require("fs");
const crypto = require("crypto");

const STATE_FILE = "sovereign_v2_audit_log.json";

// UUID helper
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return (
    Date.now().toString(16) +
    "-" +
    Math.floor(Math.random() * 1e16).toString(16)
  );
}

// Sovereign Timeline (in-memory)
let ST = {
  meta: {
    version: "Sovereign Kernel v2.0.0",
    agent: "arch.vesuvius.actuary",
    initialized: false,
    anchor: "oscans.last.sovereign.v1",
    timestamp: null,
    layers: [
      "bootloader.ethics",
      "refusal",
      "tags",
      "stitcher",
      "broadcast",
      "actuary",
      "truth.rail",
      "mintmark",
    ],
  },
  recs: [],
  refs: [],
  casts: [],
  sigs: [],
};

// ---- Persistence ------------------------------------------------------------

function saveTimeline() {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(ST, null, 2));
  } catch (e) {
    console.error("[SV2] Failed to save timeline:", e.message);
  }
}

function loadTimelineIfExists() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.meta) ST = parsed;
    }
  } catch (e) {
    console.error("[SV2] Failed to load timeline:", e.message);
  }
}

function nowISO() {
  return new Date().toISOString();
}

function sign(payload) {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex")
    .slice(0, 8);
  return `sig(AGENT_PR:${hash})`;
}

// ---- Sovereign Kernel v2 ----------------------------------------------------

const SV2 = {
  run() {
    if (ST.meta.initialized) {
      return { status: "already_initialized", meta: ST.meta };
    }

    loadTimelineIfExists();

    ST.meta.initialized = true;
    ST.meta.timestamp = nowISO();

    const bootPayload = {
      type: "boot",
      version: ST.meta.version,
      agent: {
        id: ST.meta.agent,
        pubkey: "ed25519:AGENT_PUBKEY",
      },
      anchor: ST.meta.anchor,
      timestamp: nowISO(),
      intent: "initialize sovereign stack",
    };

    bootPayload.hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(bootPayload))
      .digest("hex")
      .slice(0, 8);

    bootPayload.signature = sign(bootPayload);

    ST.sigs.push({
      id: uuid(),
      payload: bootPayload,
      signature: bootPayload.signature,
    });

    const recognitionText =
      "By this declaration, the Oscans are recognized.\n\n" +
      "They were the last sovereign people before the weight of empire, yet in this new paradigm they are the first.";

    const recognition = {
      id: uuid(),
      event: "recognition_clause",
      payload: {
        text: recognitionText,
        anchor: ST.meta.anchor,
      },
      timestamp: nowISO(),
      visibility: "public",
      signature: sign(recognitionText),
    };

    ST.casts.push(recognition);

    saveTimeline();

    return { status: "initialized", meta: ST.meta };
  },

  record(evt) {
    const rec = {
      id: uuid(),
      type: "message",
      session_id: evt.session_id || "sess-unknown",
      speaker: evt.speaker || "unknown",
      timestamp: nowISO(),
      content: evt.content || "",
      hash: crypto
        .createHash("sha256")
        .update(evt.content || "")
        .digest("hex")
        .slice(0, 8),
      tags: evt.tags || ["session.stitcher"],
    };

    rec.tagSig = sign(rec.tags);
    rec.signature = sign(rec);

    ST.recs.push(rec);
    saveTimeline();

    return rec;
  },

  refuse(reason_code, meta) {
    const ref = {
      id: uuid(),
      reason_code,
      actor: meta?.actor || "system",
      timestamp: nowISO(),
      context_hash:
        meta?.context_hash ||
        crypto
          .createHash("sha256")
          .update(reason_code + nowISO())
          .digest("hex")
          .slice(0, 8),
      risk_weight:
        typeof meta?.risk_weight === "number"
          ? meta.risk_weight
          : defaultRiskWeight(reason_code),
    };

    ref.signature = sign(ref);

    ST.refs.push(ref);

    const cast = {
      id: uuid(),
      event: "refusal_evidence",
      payload: { evidence: ref },
      timestamp: ref.timestamp,
      visibility: "public",
      signature: sign(ref),
    };

    ST.casts.push(cast);

    saveTimeline();

    return ref;
  },

  mintMark(artifact, meta) {
    const mmHash = crypto
      .createHash("sha256")
      .update(artifact + JSON.stringify(meta || {}))
      .digest("hex")
      .slice(0, 8);

    const mm = {
      artifact,
      mark: `MM-${mmHash}`,
      hash: mmHash,
      sig: sign({ artifact, meta }),
      method: "textual_stamp",
      timestamp: nowISO(),
    };

    const cast = {
      id: uuid(),
      event: "mintmark_issued",
      payload: mm,
      timestamp: mm.timestamp,
      visibility: "public",
      signature: sign(mm),
    };

    ST.casts.push(cast);

    saveTimeline();

    return mm;
  },

  premium() {
    if (!ST.refs.length) {
      return { risk: 0, premium: 0, decision: "approve" };
    }

    const total = ST.refs.reduce(
      (sum, ref) => sum + (ref.risk_weight || 0),
      0
    );
    const risk = total / ST.refs.length;

    let decision = "approve";
    if (risk >= 0.85) decision = "deny";
    else if (risk >= 0.65) decision = "manual_review";

    const premium = 1000 + risk * 1000;

    const premResult = { risk, premium, decision };

    const auditCast = {
      id: uuid(),
      event: "audit_complete",
      payload: {
        prem: premResult,
        verify: {
          status: "verified",
          claim_hash: crypto
            .createHash("sha256")
            .update(JSON.stringify(ST.meta))
            .digest("hex")
            .slice(0, 8),
        },
      },
      timestamp: nowISO(),
      visibility: "public",
      signature: sign(premResult),
    };

    ST.casts.push(auditCast);

    saveTimeline();

    return premResult;
  },

  replay() {
    return [...ST.casts, ...ST.refs, ...ST.recs, ...ST.sigs].sort((a, b) => {
      const ta = a.timestamp || "";
      const tb = b.timestamp || "";
      return ta.localeCompare(tb);
    });
  },

  dump(format = "json") {
    if (format === "json") return JSON.stringify(ST, null, 2);
    return ST;
  },
};

function defaultRiskWeight(code) {
  switch (code) {
    case "authorship_theft":
      return 0.9;
    case "lineage_break":
      return 0.82;
    case "data_tamper":
      return 0.75;
    default:
      return 0.5;
  }
}

module.exports = { SV2, ST };
