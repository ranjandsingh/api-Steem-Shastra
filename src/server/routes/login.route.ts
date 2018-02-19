import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import * as loginCtrl from '../controllers/login.controller';

const router = express.Router();

router.route('/steemconnect')
  .post(validate(paramValidation.login), loginCtrl.steemconnect);

export default router;
