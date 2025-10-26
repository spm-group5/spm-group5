/**
 * Parse time string to minutes
 * @param {string} timeString - Time string like "2 hours 30 minutes" or "45 minutes"
 * @returns {number} Minutes
 */
export function parseTimeToMinutes(timeString) {
    if (!timeString || timeString.trim() === '') return 0;
    
    // Handle "X hours Y minutes" format
    const hoursMinutesMatch = timeString.match(/(\d+)\s*hours?\s*(\d+)\s*minutes?/i);
    if (hoursMinutesMatch) {
        const hours = parseInt(hoursMinutesMatch[1]);
        const minutes = parseInt(hoursMinutesMatch[2]);
        return hours * 60 + minutes;
    }
    
    // Handle "X minutes" format
    const minutesMatch = timeString.match(/(\d+)\s*minutes?/i);
    if (minutesMatch) {
        return parseInt(minutesMatch[1]);
    }
    
    return 0;
}

/**
 * Format minutes to hours and minutes string
 * @param {number} minutes - Total minutes
 * @returns {string} Formatted time string
 */
export function formatTime(minutes) {
    if (!minutes || minutes === 0) return 'Not specified';
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
        return `${remainingMinutes} minutes`;
    } else if (remainingMinutes === 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
        return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
    }
}

/**
 * Calculate total time for a task (task time + subtask times)
 * @param {Object} task - Task object with timeTaken and subtasks
 * @param {Array} subtasks - Array of subtask objects
 * @returns {string} Formatted total time
 */
export function calculateTotalTime(task, subtasks = []) {
    console.log('=== CALCULATE TOTAL TIME DEBUG ===');
    console.log('Task:', task);
    console.log('Task timeTaken:', task.timeTaken);
    console.log('Subtasks:', subtasks);
    
    let totalMinutes = 0;
    
    // Add task time
    if (task.timeTaken) {
        const taskMinutes = parseTimeToMinutes(task.timeTaken);
        console.log('Task minutes:', taskMinutes);
        totalMinutes += taskMinutes;
    }
    
    // Add subtask times
    subtasks.forEach((subtask, index) => {
        console.log(`Subtask ${index + 1}:`, subtask);
        console.log(`Subtask ${index + 1} timeTaken:`, subtask.timeTaken);
        if (subtask.timeTaken) {
            const subtaskMinutes = parseTimeToMinutes(subtask.timeTaken);
            console.log(`Subtask ${index + 1} minutes:`, subtaskMinutes);
            totalMinutes += subtaskMinutes;
        }
    });
    
    console.log('Total minutes:', totalMinutes);
    const result = formatTime(totalMinutes);
    console.log('Formatted result:', result);
    return result;
}
