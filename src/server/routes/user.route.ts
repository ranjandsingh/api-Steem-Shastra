import paramValidation from '../../config/param-validation';
import {requireAuth, requireSupervisor} from './middleware';
import userCtrl from '../controllers/user.controller';
import * as validate from 'express-validation';
import User from '../models/user.model';
import * as express from 'express';

const router = express.Router(); // eslint-disable-line new-cap

router.route('/')
  .post(requireAuth, validate(paramValidation.createUser), userCtrl.create);

router.route('/:userId')
  .get(userCtrl.get);

router.route('/:user/avatar')
  .get(validate(paramValidation.avatarUser), userCtrl.avatar);

router.route('/:userId/repos')
  .get(userCtrl.getRepos);

router.route('/:userId/ban')
  .get(userCtrl.getBan)
  .post(requireSupervisor, validate(paramValidation.banUser), userCtrl.ban);

router.param('userId', (req, res, next, id) => {
  requireAuth(req, res, async (e) => {
    if (e) return next(e);
    try {
      (req as any).user = await User.get(id);
      next();
    } catch (e) {
      next(e);
    }
  })
});

export default router;
