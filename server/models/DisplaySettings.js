import mongoose from "mongoose";

const DisplaySettingsSchema = new mongoose.Schema(
  {
    listingSwitchMs: { type: Number, default: 60000, min: 1000 },
    photoRotateMs: { type: Number, default: 10000, min: 500 },
    uploadedRotateMs: { type: Number, default: 15000, min: 500 },
    // New: how long each uploaded seasonal image stays on screen when shown
    uploadedDisplayMs: { type: Number, default: 8000, min: 500 },
    // Selected cities (optional filter for listings)
    selectedCities: { type: [String], default: [] },
    newsRotateMs: { type: Number, default: 50000, min: 1000 },
  },
  { timestamps: true }
);

const DisplaySettings = mongoose.model("DisplaySettings", DisplaySettingsSchema);
export default DisplaySettings;
