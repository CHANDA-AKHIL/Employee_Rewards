import { Router } from 'express';
import { employeeController } from '../controllers/employeeController';
import { verifyJWT } from '../middleware/verifyJWT';
import { roleGuard } from '../middleware/roleGuard';
import { auditLog } from '../middleware/auditLog';

const router = Router();

router.use(verifyJWT);

// ── Static routes MUST come before /:id ──────────────────────────────────────
// Otherwise Express matches "me" and "stats" as the :id param

// Employee updates their own profile/password — any authenticated user
router.put('/me', employeeController.updateMe);

// Admin-only list + create
router.get('/', roleGuard('ADMIN'), employeeController.list);
router.post('/', roleGuard('ADMIN'), auditLog('CREATE', 'employees'), employeeController.create);

// Dynamic :id routes
router.get('/:id', employeeController.getById);
router.get('/:id/stats', employeeController.getStats);

// Peer recognition — any authenticated employee can give recognition
router.post('/:id/recognize', employeeController.recognize);

// Admin-only modifications
router.put('/:id', roleGuard('ADMIN'), auditLog('UPDATE', 'employees'), employeeController.update);
router.patch('/:id/block', roleGuard('ADMIN'), auditLog('UPDATE', 'employees'), employeeController.toggleBlock);
router.delete('/:id', roleGuard('ADMIN'), auditLog('DELETE', 'employees'), employeeController.softDelete);

export default router;