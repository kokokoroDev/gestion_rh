import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { register, login, refreshToken, changePassword, getMe } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema
} from '../validations/auth.js';
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Trop de tentatives, réessayez plus tard'
});

const router = Router();


router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);

router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

// Returns fresh current-user data (used to sync mon_cong etc.)
router.get('/me', authenticate, getMe);

export default router;
