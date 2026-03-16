import { Router } from 'express';
import { authController } from '../controllers/authController';
import { verifyJWT } from '../middleware/verifyJWT';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', verifyJWT, authController.logout);
router.get('/me', verifyJWT, authController.me);

export default router;
