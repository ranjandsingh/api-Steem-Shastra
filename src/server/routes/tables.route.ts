import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import tablesCtrl from '../controllers/table.controller';

const router = express.Router();

router.route('/:type')
  .get(validate(paramValidation.tables), tablesCtrl.list);

export default router;