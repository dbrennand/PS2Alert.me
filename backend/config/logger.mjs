// Import required libraries
import pino from 'pino';

// Export Pino logger
export default pino({
    // Ignore pid and hostname
    ignore: 'pid,hostname',
    // Set formatter so level label is shown instead of an integer
    formatters: {
        level: (label) => {
            return { level: label };
        }
    }
})
