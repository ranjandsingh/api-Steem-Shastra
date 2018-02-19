import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import sponsorCtrl from '../controllers/sponsor.controller';
import { requireAuth } from './middleware';

const router = express.Router();

router.route('/')
  .get(sponsorCtrl.list)
  .post(requireAuth,
        validate(paramValidation.createSponsor),
        sponsorCtrl.create);

export default router;
