import * as express from 'express';
import statsCtrl from '../controllers/stats.controller';

const router = express.Router();

router.route('/')
  .get(statsCtrl.list)

export default router;
