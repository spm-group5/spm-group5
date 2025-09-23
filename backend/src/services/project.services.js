import Project from '../models/project.model.js';
import mongoose from 'mongoose';

class ProjectService {
    validateObjectId(id, fieldName = 'ID') {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid ${fieldName} format`);
        }
    }

    async createProject(projectData, userId) {
        const { name, description, members } = projectData;

        if (!name || name.trim() === '') {
            throw new Error('Project name is required');
        }

        const newProject = new Project({
            name: name.trim(),
            description: description || '',
            owner: userId,
            members: members || [userId],
            status: 'Active',
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return await newProject.save();
    }

    async getProjects(userId) {
        return await Project.find({
            $or: [
                { owner: userId },
                { members: userId }
            ]
        })
        .populate('owner', 'username')
        .populate('members', 'username')
        .sort({ createdAt: -1 });
    }

    async getProjectById(projectId) {
        const project = await Project.findById(projectId)
            .populate('owner', 'username')
            .populate('members', 'username');

        if (!project) {
            throw new Error('Project not found');
        }

        return project;
    }

    async updateProject(projectId, updateData, userId) {
        this.valida
        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId.toString()) {
            throw new Error('Only project owner can update the project');
        }

        if (updateData.name !== undefined) {
            if (!updateData.name || updateData.name.trim() === '') {
                throw new Error('Project name cannot be empty');
            }
            project.name = updateData.name.trim();
        }

        if (updateData.description !== undefined) {
            project.description = updateData.description;
        }

        if (updateData.status !== undefined) {
            project.status = updateData.status;
        }

        if (updateData.members !== undefined) {
            project.members = updateData.members;
        }

        project.updatedAt = new Date();
        return await project.save();
    }

    async deleteProject(projectId, userId) {
        this.validateObjectId(projectId, 'project ID');
        this.validateObjectId(userId, 'user ID');

        const project = await Project.findById(projectId);

        if (!project) {
            throw new Error('Project not found');
        }

        if (project.owner.toString() !== userId.toString()) {
            throw new Error('Only project owner can delete the project');
        }

        return await Project.findByIdAndDelete(projectId);
    }
}

export default new ProjectService();