import { Router } from 'express';
import multer from 'multer';
import { gamificationController } from '../controllers/gamificationController';
import { verifyJWT } from '../middleware/verifyJWT';
import { roleGuard } from '../middleware/roleGuard';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.use(verifyJWT);

// Badges
router.get('/badges', gamificationController.listBadges);
router.get('/badges/mine', gamificationController.myBadges);
router.post('/badges', roleGuard('ADMIN'), upload.single('image'), gamificationController.createBadge);

// Leaderboard
router.get('/leaderboard', gamificationController.leaderboard);
router.get('/leaderboard/me', gamificationController.myRank);

// Challenges
router.get('/challenges', gamificationController.listChallenges);
router.post('/challenges', roleGuard('ADMIN'), gamificationController.createChallenge);
router.get('/challenges/:id/progress', gamificationController.challengeProgress);
router.post('/challenges/:id/join', gamificationController.joinChallenge);

export default router;
