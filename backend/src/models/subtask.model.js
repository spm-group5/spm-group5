import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Subtask title is required'],
    trim: true,
    minlength: [1, 'Title must be at least 1 character long'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  parentTaskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Parent task ID is required']
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project ID is required']
  },
  status: {
    type: String,
    enum: ['To Do', 'In Progress', 'Completed', 'Blocked', 'Archived'],
    default: 'To Do'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  assigneeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: false
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: [true, 'Owner ID is required']
  },
  dueDate: {
    type: Date,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
subtaskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Add index for faster queries
subtaskSchema.index({ parentTaskId: 1, status: 1 });
subtaskSchema.index({ projectId: 1, status: 1 });

const Subtask = mongoose.model('Subtask', subtaskSchema);

export default Subtask;

