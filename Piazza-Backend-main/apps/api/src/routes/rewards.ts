import { Router } from 'express';
import multer from 'multer';
import { rewardController } from '../controllers/rewardController';
import { verifyJWT } from '../middleware/verifyJWT';
import { roleGuard } from '../middleware/roleGuard';
import { auditLog } from '../middleware/auditLog';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.use(verifyJWT);

router.get('/', rewardController.list);
router.post('/', roleGuard('ADMIN'), upload.single('image'), auditLog('CREATE', 'rewards'), rewardController.create);
router.get('/:id', rewardController.getById);
router.put('/:id', roleGuard('ADMIN'), upload.single('image'), auditLog('UPDATE', 'rewards'), rewardController.update);
router.delete('/:id', roleGuard('ADMIN'), auditLog('DELETE', 'rewards'), rewardController.remove);

export default router;
