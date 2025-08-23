import mongoose from "mongoose";

const SeasonalImageSchema = new mongoose.Schema(
  {
    originalName: String,
    filename: String,
    path: String,
    size: Number,
    mimetype: String,
    url: String,
    selected: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const SeasonalImage = mongoose.model("SeasonalImage", SeasonalImageSchema);
export default SeasonalImage;
