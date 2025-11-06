/**
 * Utility functions for handling assignee operations
 */

/**
 * Normalizes assignee IDs to an array of strings
 * Handles null, undefined, single values, and arrays
 *
 * @param {*} assigneeId - Can be null, undefined, a single ID, or an array of IDs
 * @returns {string[]} - Array of assignee IDs as strings
 */
export const normalizeAssigneeIds = (assigneeId) => {
  // Handle null or undefined
  if (assigneeId === null || assigneeId === undefined) {
    return [];
  }

  // Handle array of IDs
  if (Array.isArray(assigneeId)) {
    return assigneeId.map(id => id.toString());
  }

  // Handle single ID
  return [assigneeId.toString()];
};

/**
 * Finds assignees that were newly added (present in newAssignees but not in oldAssignees)
 *
 * @param {string[]} oldAssignees - Array of old assignee IDs as strings
 * @param {string[]} newAssignees - Array of new assignee IDs as strings
 * @returns {string[]} - Array of newly added assignee IDs
 */
export const findAddedAssignees = (oldAssignees, newAssignees) => {
  return newAssignees.filter(assigneeId => !oldAssignees.includes(assigneeId));
};

/**
 * Finds assignees that were removed (present in oldAssignees but not in newAssignees)
 *
 * @param {string[]} oldAssignees - Array of old assignee IDs as strings
 * @param {string[]} newAssignees - Array of new assignee IDs as strings
 * @returns {string[]} - Array of removed assignee IDs
 */
export const findRemovedAssignees = (oldAssignees, newAssignees) => {
  return oldAssignees.filter(assigneeId => !newAssignees.includes(assigneeId));
};
