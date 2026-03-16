import { Router } from 'express';
import { auditController } from '../controllers/auditController';
import { verifyJWT } from '../middleware/verifyJWT';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();
router.use(verifyJWT);
router.use(roleGuard('ADMIN'));

router.get('/', auditController.list);

export default router;
