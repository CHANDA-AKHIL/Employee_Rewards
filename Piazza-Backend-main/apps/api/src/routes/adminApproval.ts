import { Router } from 'express';
import { adminApprovalController } from '../controllers/adminApprovalController';
import { verifyJWT } from '../middleware/verifyJWT';

const router = Router();

router.use(verifyJWT);

router.get('/pending', adminApprovalController.listPendingAdmins);
router.post('/:id/approve', adminApprovalController.approveAdmin);

export default router;
