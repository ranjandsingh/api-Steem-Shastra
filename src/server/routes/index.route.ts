import * as express from 'express';
import { requireAuth } from './middleware';

import userRoutes from './user.route';
import postRoutes from './post.route';
import sponsorRoutes from './sponsor.route';
import moderatorRoutes from './moderator.route';
import statsRoutes from './stats.route';
import projectRoutes from './project.route';
import loginRoutes from './login.route';
import logoutRoutes from './logout.route';
import sc2Routes from './sc2.route';
import socialLoginRoutes from './social_login.route';
import tableRoutes from './tables.route';
import faqRoutes from './faq.route';
import ruleRoutes from './rule.route';

const router = express.Router(); // eslint-disable-line new-cap

/** GET /health-check - Check service health */
router.get('/health-check', (req, res) =>
  res.send('OK')
);

// mount user routes at /users
router.use('/users', userRoutes);

router.use('/login', loginRoutes);

router.use('/logout', requireAuth, logoutRoutes);

router.use('/sc2', requireAuth, sc2Routes);

router.use('/projects', requireAuth, projectRoutes);

router.use('/posts', postRoutes);

router.use('/stats', statsRoutes);

router.use('/sponsors', sponsorRoutes);

router.use('/moderators', moderatorRoutes);

router.use('/tables', tableRoutes);

router.use('/auth', socialLoginRoutes);

router.use('/faq', faqRoutes);

router.use('/rules', ruleRoutes)

export default router;
