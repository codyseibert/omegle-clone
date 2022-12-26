import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema({
  status: String,
});

export default mongoose.models.Room || mongoose.model("Room", RoomSchema);
