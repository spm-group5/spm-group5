// Authentication middleware for protected routes

/**
 * Middleware to require authentication
 * Checks if user is authenticated via session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const requireAuth = (req, res, next) => {
    if (req.session && req.session.authenticated && req.session.userId) {
        // User is authenticated, set req.user and proceed
        req.user = {
            _id: req.session.userId,
            username: req.session.username,
            roles: req.session.userRoles || [],
            department: req.session.userDepartment
        };
        next();
    } else {
        // User is not authenticated, return 401 Unauthorized
        res.status(401).json({ 
            error: 'Unauthorized',
            message: 'Authentication required to access this resource'
        });
    }
};

/**
 * Middleware to require specific roles
 * Should be used after requireAuth middleware
 * @param {Array|String} allowedRoles - Role(s) that are allowed to access the route
 * @returns {Function} Middleware function
 */
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        // Check if user is authenticated first
        if (!req.session || !req.session.authenticated || !req.session.userId) {
            return res.status(401).json({ 
                error: 'Unauthorized',
                message: 'Authentication required to access this resource'
            });
        }

        // Get user roles from session
        const userRoles = req.session.userRoles || [];
        
        // Convert allowedRoles to array if it's a string
        const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        // Check if user has any of the required roles
        const hasRequiredRole = rolesArray.some(role => userRoles.includes(role));
        
        if (hasRequiredRole) {
            next();
        } else {
            res.status(403).json({ 
                error: 'Forbidden',
                message: 'Insufficient permissions to access this resource',
                requiredRoles: rolesArray,
                userRoles: userRoles
            });
        }
    };
};

/**
 * Middleware to require specific department
 * Should be used after requireAuth middleware
 * @param {Array|String} allowedDepartments - Department(s) that are allowed to access the route
 * @returns {Function} Middleware function
 */
const requireDepartment = (allowedDepartments) => {
    return (req, res, next) => {
        // Check if user is authenticated first
        if (!req.session || !req.session.authenticated || !req.session.userId) {
            return res.status(401).json({ 
                error: 'Unauthorized',
                message: 'Authentication required to access this resource'
            });
        }

        // Get user department from session
        const userDepartment = req.session.userDepartment;
        
        // Convert allowedDepartments to array if it's a string
        const departmentsArray = Array.isArray(allowedDepartments) ? allowedDepartments : [allowedDepartments];
        
        // Check if user's department is allowed
        if (departmentsArray.includes(userDepartment)) {
            next();
        } else {
            res.status(403).json({ 
                error: 'Forbidden',
                message: 'Insufficient department permissions to access this resource',
                requiredDepartments: departmentsArray,
                userDepartment: userDepartment
            });
        }
    };
};

/**
 * Optional authentication middleware
 * Sets req.user if authenticated, but doesn't block unauthenticated users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = (req, res, next) => {
    if (req.session && req.session.authenticated && req.session.userId) {
        req.user = {
            id: req.session.userId,
            username: req.session.username,
            roles: req.session.userRoles || [],
            department: req.session.userDepartment
        };
    }
    next();
};

export {
    requireAuth,
    requireRole,
    requireDepartment,
    optionalAuth
};
