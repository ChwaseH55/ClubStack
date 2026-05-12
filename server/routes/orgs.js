import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { wrap } from '../middleware/async.js';

const router = Router();
router.use(requireAuth);

const toOrg = row => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  branding: row.branding,
  enabledFeatures: row.enabled_features,
});

router.post('/', wrap(async (req, res) => {
  const { name, slug, branding = {}, enabledFeatures = [] } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'name and slug are required' });
  try {
    const { rows } = await query(
      `INSERT INTO organizations (name, slug, branding, enabled_features)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, branding, enabled_features`,
      [name, slug, JSON.stringify(branding), enabledFeatures]
    );
    await query(
      `INSERT INTO memberships (org_id, user_id, role, status)
       VALUES ($1, $2, 'owner', 'active')`,
      [rows[0].id, req.user.id]
    );
    res.status(201).json(toOrg(rows[0]));
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Slug already taken' });
    throw err;
  }
}));

router.get('/:orgId', wrap(async (req, res) => {
  const { rows } = await query(
    'SELECT id, name, slug, branding, enabled_features FROM organizations WHERE id = $1',
    [req.params.orgId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Org not found' });
  res.json(toOrg(rows[0]));
}));

router.patch('/:orgId', wrap(async (req, res) => {
  const { name, branding } = req.body;
  await query(
    `UPDATE organizations
     SET name = COALESCE($1, name), branding = COALESCE($2, branding)
     WHERE id = $3`,
    [name ?? null, branding ? JSON.stringify(branding) : null, req.params.orgId]
  );
  res.json({ success: true });
}));

router.put('/:orgId/features', wrap(async (req, res) => {
  const { enabledFeatures } = req.body;
  if (!Array.isArray(enabledFeatures)) {
    return res.status(400).json({ error: 'enabledFeatures must be an array' });
  }
  await query(
    'UPDATE organizations SET enabled_features = $1 WHERE id = $2',
    [enabledFeatures, req.params.orgId]
  );
  res.json({ enabledFeatures });
}));

export default router;
