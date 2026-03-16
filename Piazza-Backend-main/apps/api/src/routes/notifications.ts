import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { verifyJWT } from '../middleware/verifyJWT';

const router = Router();

router.use(verifyJWT);

router.get('/', notificationController.list);
router.put('/:id/read', notificationController.markRead);
router.put('/read-all', notificationController.markAllRead);
router.get('/unread-count', notificationController.unreadCount);

export default router;
