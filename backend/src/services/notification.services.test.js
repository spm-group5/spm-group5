import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import projectService from './project.services.js';
import Project from '../models/project.model.js';
import User from '../models/user.model.js';

let mongoServer;

describe('Notification Service', () => {
  test('Sample test', () => {
    expect(true).toBe(true);
  });
});