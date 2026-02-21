function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized. Please log in.' });
}

module.exports = { requireAdmin };
