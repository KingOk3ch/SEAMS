/**
 * Parses backend errors into a clean object for forms
 * @param {Object} errorResponse - The JSON error from Django API
 * @returns {Object} - { global: "General error message", fields: { username: "Error...", ... } }
 */
export const parseBackendErrors = (errorResponse) => {
    let result = { global: '', fields: {} };

    if (!errorResponse) {
        result.global = "An unknown error occurred.";
        return result;
    }

    // Handle standard Django field errors { "email": ["Invalid"], "password": ["Too short"] }
    Object.keys(errorResponse).forEach((key) => {
        const value = errorResponse[key];
        // If value is array, take first string. If string, take it directly.
        const message = Array.isArray(value) ? value[0] : value;

        if (key === 'non_field_errors' || key === 'detail' || key === 'error') {
            result.global = message;
        } else {
            result.fields[key] = message;
        }
    });

    // Fallback if no specific errors found
    if (!result.global && Object.keys(result.fields).length === 0) {
        result.global = "Operation failed. Please check your input.";
    }

    return result;
};