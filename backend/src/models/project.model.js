import mongoose from 'mongoose';
const Schema = mongoose.Schema;

/**
 * Project Schema
 *
 * Purpose: Define the structure and validation rules for project documents
 *
 * Key Features:
 * - Name validation (required, non-empty string)
 * - Status management with enum validation (To Do, In Progress, Completed, Blocked)
 * - Optional priority ranking (1-10)
 * - Optional due date validation
 * - Optional tags array for categorization
 * - Owner reference to user who created the project
 * - Optional description field
 * - Member management for project collaboration
 * - Archive functionality that cascades to all project tasks
 * - Automatic timestamp tracking
 *
 * Fields:
 * - name: Required project name (String, trimmed, non-empty)
 * - description: Optional project description (String, default empty)
 * - owner: Required reference to user who created project (ObjectId)
 * - members: Array of user references for project members (ObjectId[])
 * - status: Project status with default "To Do" (Enum: To Do, In Progress, Completed, Blocked)
 * - priority: Optional priority ranking (Number, 1-10 range)
 * - dueDate: Optional project due date (Date)
 * - tags: Optional array of tags for categorization (String[], default empty)
 * - archived: Boolean flag for archived status (Boolean, default false)
 * - archivedAt: Timestamp when project was archived (Date, default null)
 * - createdAt: Timestamp when project was created (Date)
 * - updatedAt: Timestamp when project was last updated (Date)
 */
const projectSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Project name is required'],
        validate: {
            validator: function(v) {
                return typeof v === 'string' && v.trim().length > 0;
            },
            message: 'Project name must be a non-empty string'
        },
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    members: [{
        type: Schema.Types.ObjectId,
        ref: 'users'
    }],
    status: {
        type: String,
        enum: {
            values: ['To Do', 'In Progress', 'Completed', 'Blocked'],
            message: 'Status must be one of: To Do, In Progress, Completed, Blocked'
        },
        default: 'To Do'
    },
    priority: {
        type: Number,
        min: [1, 'Priority must be at least 1'],
        max: [10, 'Priority must be at most 10'],
        required: false,
        validate: {
            validator: function(v) {
                if (v === undefined || v === null) return true;
                return Number.isInteger(v) && v >= 1 && v <= 10;
            },
            message: 'Priority must be a number between 1 and 10'
        }
    },
    dueDate: {
        type: Date,
        required: false
    },
    tags: {
        type: [String],
        default: []
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
    }
});

projectSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const projectModel = mongoose.models.projects || mongoose.model('projects', projectSchema);

export default projectModel;