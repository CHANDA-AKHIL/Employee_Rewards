import { Router } from 'express';
import { notificationController } from '../controllers/notificationController';
import { verifyJWT } from '../middleware/verifyJWT';

const router = Router();

router.use(verifyJWT);

// IMPORTANT: /read-all and /unread-count MUST be defined BEFORE /:id
// Otherwise Express matches "read-all" and "unread-count" as the :id param
router.get('/unread-count', notificationController.unreadCount);
router.put('/read-all', notificationController.markAllRead);

router.get('/', notificationController.list);
router.put('/:id/read', notificationController.markRead);

export default router;