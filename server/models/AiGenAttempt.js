import mongoose from "mongoose";

const AiGenAttemptSchema = new mongoose.Schema(
  {
    clientKey: { type: String, index: true },
    eventKey: { type: String, index: true },
  },
  { timestamps: true }
);

// TTL index to auto-expire attempts after 24 hours
AiGenAttemptSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });
AiGenAttemptSchema.index({ clientKey: 1, eventKey: 1, createdAt: 1 });

const AiGenAttempt = mongoose.model("AiGenAttempt", AiGenAttemptSchema);
export default AiGenAttempt;
