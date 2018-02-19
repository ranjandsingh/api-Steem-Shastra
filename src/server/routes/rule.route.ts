import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import ruleCtrl from '../controllers/rule.controller';
import {requireAuth, requireMod} from "./middleware";

const router = express.Router();

router.route('/')
  .post(requireAuth, requireMod, validate(paramValidation.createRule), ruleCtrl.create)
  .put(requireAuth, requireMod,  validate(paramValidation.updateRule), ruleCtrl.update)
  .get(validate(paramValidation.listRule), ruleCtrl.list);

export default router;
