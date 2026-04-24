/**
 * Authentication middleware
 * Verifies that the user is authenticated via Passport session.
 * Returns 401 if not authenticated.
 */
const requireAuth = (req, res, next) =>
  req.isAuthenticated()
    ? next()
    : res.status(401).json({ error: "Unauthorized" });

module.exports = { requireAuth };