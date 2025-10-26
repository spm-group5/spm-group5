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
    type: String,
    trim: true,
    maxlength: [100, 'Time taken cannot exceed 100 characters'],
    validate: {
      validator: function(v) {
        // Allow empty or null values
        if (!v || v.trim() === '') {
          return true;
        }
        
        // Validate 15-minute increment format
        return this.isValidTimeFormat(v);
      },
      message: 'Time must be in 15-minute increments (e.g., "15 minutes", "1 hour", "1 hour 15 minutes")'
    }
  },
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
  
  // Set archivedAt when archived is true
  if (this.archived && !this.archivedAt) {
    this.archivedAt = new Date();
  } else if (!this.archived) {
    this.archivedAt = null;
  }
  
  next();
});

// Add index for faster queries
subtaskSchema.index({ parentTaskId: 1, status: 1 });

// Add method to validate 15-minute increment time format
subtaskSchema.methods.isValidTimeFormat = function(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return false;
  }

  const trimmedTime = timeString.trim();
  
  // Pattern for "X minutes" - only allow 15, 30, 45 (not 60+ which should be hours)
  const minutesPattern = /^(\d+)\s+minutes$/;
  const minutesMatch = trimmedTime.match(minutesPattern);
  if (minutesMatch) {
    const minutes = parseInt(minutesMatch[1]);
    return minutes === 15 || minutes === 30 || minutes === 45;
  }

  // Pattern for "X hour" or "X hours" - any number of hours is valid
  const hoursPattern = /^(\d+)\s+hours?$/;
  const hoursMatch = trimmedTime.match(hoursPattern);
  if (hoursMatch) {
    return true; // Any number of hours is valid
  }

  // Pattern for "X hour Y minutes" or "X hours Y minutes" - Y must be 15, 30, or 45
  const hoursMinutesPattern = /^(\d+)\s+hours?\s+(15|30|45)\s+minutes$/;
  const hoursMinutesMatch = trimmedTime.match(hoursMinutesPattern);
  if (hoursMinutesMatch) {
    return true; // This pattern already ensures 15-minute increments
  }

  return false;
};

// Check if model already exists to avoid overwrite errors
const Subtask = mongoose.models.Subtask || mongoose.model('Subtask', subtaskSchema);

export default Subtask;

