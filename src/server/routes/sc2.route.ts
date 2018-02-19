import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import * as sc2Ctrl from '../controllers/sc2.controller';

const router = express.Router();

router.route('/profile')
      .post(sc2Ctrl.profile)
      .put(sc2Ctrl.updateProfile);
router.route('/broadcast').post(sc2Ctrl.broadcast);

export default router;
