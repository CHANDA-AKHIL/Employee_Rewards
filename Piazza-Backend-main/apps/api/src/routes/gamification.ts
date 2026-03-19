import { Router } from 'express';
import multer from 'multer';
import { gamificationController } from '../controllers/gamificationController';
import { verifyJWT } from '../middleware/verifyJWT';
import { roleGuard } from '../middleware/roleGuard';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for PDFs and docs
});

const router = Router();
router.use(verifyJWT);

// ── Badges ─────────────────────────────────────────────────────────────────────
// Static routes MUST be before /:id routes
router.get('/badges/mine', gamificationController.myBadges);
router.get('/badges', gamificationController.listBadges);
router.post('/badges', roleGuard('ADMIN'), upload.single('image'), gamificationController.createBadge);

// ── Leaderboard ────────────────────────────────────────────────────────────────
router.get('/leaderboard/me', gamificationController.myRank);
router.get('/leaderboard', gamificationController.leaderboard);

// ── Challenges (static routes BEFORE /:id routes) ─────────────────────────────
router.get('/challenges', gamificationController.listChallenges);

// Admin creates challenge with optional brief file (multipart/form-data)
router.post('/challenges', roleGuard('ADMIN'), upload.single('brief'), gamificationController.createChallenge);

// Admin: list all submissions waiting for review
router.get('/challenges/submissions', roleGuard('ADMIN'), gamificationController.listSubmissions);

// Admin: approve a specific submission
router.post('/challenges/submissions/:id/approve', roleGuard('ADMIN'), gamificationController.approveSubmission);

// ── Challenge :id routes (MUST come after static routes above) ─────────────────
router.get('/challenges/:id/progress', gamificationController.challengeProgress);
router.post('/challenges/:id/join', gamificationController.joinChallenge);

// Employee submits work for a challenge (optional file upload)
router.post('/challenges/:id/submit', upload.single('submissionFile'), gamificationController.submitChallenge);

export default router;