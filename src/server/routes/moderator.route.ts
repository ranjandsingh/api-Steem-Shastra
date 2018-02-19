import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import moderatorCtrl from '../controllers/moderator.controller';
import {requireAuth, requireSupervisor} from './middleware';

const router = express.Router();

router.route('/')
  .get(moderatorCtrl.list)
  .post(requireAuth, requireSupervisor,
        validate(paramValidation.createMod), moderatorCtrl.create);

router.route('/rm')
  .post(requireAuth, requireSupervisor,
        validate(paramValidation.removeMod), moderatorCtrl.remove);

export default router;
