require('dotenv').config();
const { Client, FileContentsQuery, TopicMessageQuery, PrivateKey } = require("@hashgraph/sdk");

async function boot() {
    console.log("🛠️  ieOS KERNEL v0.1: INITIALIZING BOOT SEQUENCE...");

    const client = Client.forTestnet();
    const myPrivateKey = PrivateKey.fromStringDer(process.env.HEDERA_OPERATOR_KEY);
    client.setOperator(process.env.HEDERA_OPERATOR_ID, myPrivateKey);

    try {
        // --- STAGE 1: READ THE CAPSULE (FILE 85) ---
        console.log("🧬 Querying Capsule (File 0.0.7564185)...");
        const fileQuery = await new FileContentsQuery()
            .setFileId("0.0.7564885")
            .execute(client);

        const capsuleData = JSON.parse(fileQuery.toString());
        const heartbeatTopic = capsuleData.topic; // FIXED

        console.log(`✅ Capsule Loaded. Identity: ${capsuleData.root}`); // FIXED
        console.log(`📡 Heartbeat Topic Identified: ${heartbeatTopic}`);

        // --- STAGE 2: SYNC THE HEARTBEAT (TOPIC 883) ---
        console.log("🔄 Syncing State from Heartbeat...");

        new TopicMessageQuery()
            .setTopicId(heartbeatTopic)
            .setStartTime(0) // Replay history to build local state
            .subscribe(
                client,
                (err) => console.error(`❌ Stream Error: ${err}`),
                (message) => {
                    const data = Buffer.from(message.contents, "utf8").toString();
                    const seq = message.sequenceNumber;

                    // Logic Gate: Identify if it's a Rule or just a Pulse
                    if (data.includes("SET_RULE")) {
                        console.log(`⚖️  [Seq: ${seq}] ETHICS RULE UPDATED: ${data}`);
                    } else {
                        console.log(`💓 [Seq: ${seq}] HEARTBEAT: ${data}`);
                    }
                }
            );

    } catch (error) {
        console.error("🚨 BOOT FAILURE:", error.message);
    }
}

boot();