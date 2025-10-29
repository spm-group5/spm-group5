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
    enum: ['To Do', 'In Progress', 'Completed', 'Blocked'],
    default: 'To Do'
  },
  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 5
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
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrenceInterval: {
    type: Number,
    default: null,
    validate: {
      validator: function(v) {
        // If subtask is recurring, interval must be positive
        if (this.isRecurring && (!v || v <= 0)) {
          return false;
        }
        // If not recurring, interval should be null or undefined
        if (!this.isRecurring && v) {
          return false;
        }
        return true;
      },
      message: 'Recurrence interval must be a positive number for recurring subtasks'
    }
  },
  timeTaken: {
    type: Number,
    default: 0,
    min: 0,
    validate: {
      validator: function(v) {
        return typeof v === 'number' && v >= 0;
      },
      message: 'Time taken must be a non-negative number'
    }
  },
  comments: [{
    text: {
      type: String,
      required: true
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: true
    },
    authorName: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  archived: {
    type: Boolean,
    default: false
  },
  archivedAt: {
    type: Date,
    default: null
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

// Check if model already exists to avoid overwrite errors
const Subtask = mongoose.models.Subtask || mongoose.model('Subtask', subtaskSchema);

export default Subtask;

