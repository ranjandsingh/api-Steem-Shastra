import * as logoutCtrl from '../controllers/logout.controller';
import * as express from 'express';

const router = express.Router();

router.route('/').get(logoutCtrl.logout);

export default router;
