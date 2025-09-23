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
    status: {
        type: String,
        enum: ['To Do', 'In Progress', 'Done'],
        default: 'To Do',
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    assignee: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        default: null
    },
    project: {
        type: Schema.Types.ObjectId,
        ref: 'projects',
        default: null
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
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

taskSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task;