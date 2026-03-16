import { Router } from 'express';
import { redemptionController } from '../controllers/redemptionController';
import { verifyJWT } from '../middleware/verifyJWT';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

router.use(verifyJWT);

router.get('/', redemptionController.list);
router.post('/', redemptionController.create);
router.get('/:id', redemptionController.getById);
router.post('/:id/approve', roleGuard('ADMIN'), redemptionController.approve);
router.post('/:id/reject', roleGuard('ADMIN'), redemptionController.reject);

export default router;
