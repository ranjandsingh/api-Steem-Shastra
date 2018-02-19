import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import faqCtrl from '../controllers/faq.controller';
import {requireAuth, requireMod} from "./middleware";

const router = express.Router();

router.route('/')
  .post(requireAuth, requireMod, validate(paramValidation.createFaq), faqCtrl.create)
  .put(requireAuth, requireMod,  validate(paramValidation.updateFaq), faqCtrl.update)
  .get(validate(paramValidation.listFaq), faqCtrl.list);

export default router;
