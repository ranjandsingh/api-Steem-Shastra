import * as HttpStatus from 'http-status';
import {getToken} from '../sc2';
import * as express from 'express';
import * as crypto from 'crypto';
import Session from '../models/session.model';
import * as mongoose from 'mongoose';
import steemAPI from '../steemAPI';

export async function logout(req: express.Request,
                              res: express.Response,
                              next: express.NextFunction) {
  try {
    await Session.findOneAndRemove({ session: res.locals.session });
    return res.sendStatus(HttpStatus.OK);
  } catch (e) {
    return next(e);
  }
}
