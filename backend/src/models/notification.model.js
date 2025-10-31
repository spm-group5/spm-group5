import mongoose from "mongoose";

const Schema = mongoose.Schema;

const notificationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  message: {
    type: String,
  },
  task: {
    type: Schema.Types.ObjectId,
    ref: "tasks",
  },
  assignor: {
    type: String,
  },
  deadline: {
    type: Date,
  },
  read: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  project: { 
    type: Schema.Types.ObjectId, 
    ref: "projects",
  },
  projectName: { 
    type: String,
  }
});

const notificationModel =
  mongoose.models.notifications ||
  mongoose.model("notifications", notificationSchema);

export default notificationModel;
