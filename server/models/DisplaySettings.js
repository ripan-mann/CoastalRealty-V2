import mongoose from "mongoose";

const DisplaySettingsSchema = new mongoose.Schema(
  {
    listingSwitchMs: { type: Number, default: 60000, min: 1000 },
    photoRotateMs: { type: Number, default: 10000, min: 500 },
    uploadedRotateMs: { type: Number, default: 15000, min: 500 },
  },
  { timestamps: true }
);

const DisplaySettings = mongoose.model("DisplaySettings", DisplaySettingsSchema);
export default DisplaySettings;

