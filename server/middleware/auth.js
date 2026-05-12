import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(Object.assign(new Error('Unauthorized'), { status: 401 }));
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    next(Object.assign(new Error('Invalid token'), { status: 401 }));
  }
}
