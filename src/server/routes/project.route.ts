import * as express from 'express';
import * as validate from 'express-validation';
import paramValidation from '../../config/param-validation';
import projectCtrl from '../controllers/project.controller';

const router = express.Router();

router.route('/')
  .post(validate(paramValidation.createProject), projectCtrl.create);

router.route('/:platform/:externalId/')
    .get(projectCtrl.get)

router.route('/:platform/:externalId/sponsors')
    .post(validate(paramValidation.createProjectSponsor), projectCtrl.createSponsor);

router.route('/:platform/:externalId/sponsors/vote')
    .post(validate(paramValidation.voteWithSponsors), projectCtrl.voteWithSponsors);

export default router;
