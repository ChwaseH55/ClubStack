import { Router } from 'express';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/async.js';

const router = Router();
router.use(requireAuth);

router.get('/me', wrap(async (req, res) => {
  const { rows } = await query(
    'SELECT id, email, name, avatar_url FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(rows[0]);
}));

router.patch('/me', wrap(async (req, res) => {
  const { name, avatarUrl } = req.body;
  await query(
    `UPDATE users
     SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url)
     WHERE id = $3`,
    [name ?? null, avatarUrl ?? null, req.user.id]
  );
  res.json({ success: true });
}));

router.post('/me/password', wrap(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  const { rows } = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [req.user.id]
  );
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  await query(
    'UPDATE users SET password_hash = $1 WHERE id = $2',
    [await bcrypt.hash(newPassword, 12), req.user.id]
  );
  res.json({ success: true });
}));

export default router;
