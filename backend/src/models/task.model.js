import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const taskSchema = new Schema({
    title: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return typeof v === 'string' && v.trim().length > 0;
            },
            message: 'Title must be a non-empty string'
        }
    },
    description: {
        type: String,
        default: ''
    },
    priority: {
        type: Number,
        required: true,
        min: 1,
        max: 10,
        default: 5
    },
    status: {
        type: String,
        enum: ['To Do', 'In Progress', 'Blocked', 'Done'],
        default: 'To Do',
        required: true
    },
    tags: {
        type: String,
        default: '',
        validate: {
            validator: function(v) {
                return typeof v === 'string';
            },
            message: 'Tags must be a string'
        }
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    // Task assignee should be 1 or more
    assignee: {
        type: [Schema.Types.ObjectId],
        ref: 'users',
        default: [],
        validate: {
            validator: function(v) {
                return v.length <= 5;
            },
            message: 'A task can have a maximum of 5 assignees'
        }
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'projects',
        required: true
    },
    dueDate: {
        type: Date,
        default: null,
        validate: {
            validator: function(v) {
                if (!v) return true;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dueDate = new Date(v);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate >= today;
            },
            message: 'Due date cannot be in the past'
        }
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
                // If task is recurring, interval must be positive
                if (this.isRecurring && (!v || v <= 0)) {
                    return false;
                }
                // If not recurring, interval should be null or undefined
                if (!this.isRecurring && v) {
                    return false;
                }
                return true;
            },
            message: 'Recurrence interval must be a positive number for recurring tasks'
        }
    },
    archived: {
        type: Boolean,
        default: false
    },
    archivedAt: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
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
    }
});

taskSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Add method to validate 15-minute increment time format
taskSchema.methods.isValidTimeFormat = function(timeString) {
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

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task;