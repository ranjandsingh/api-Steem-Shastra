import Moderator from '../models/moderator.model';
import Session from '../models/session.model';
import * as HttpStatus from 'http-status';
import * as express from 'express';

export function requireAuth(req: express.Request,
                            res: express.Response,
                            next: express.NextFunction) {
  const session = req.cookies.session || req.headers.session;
  if (!session) {
    return res.sendStatus(HttpStatus.UNAUTHORIZED);
  }
  Session.get(session).then(user => {
    if (!user) {
      res.status(HttpStatus.UNAUTHORIZED)
      return res.json({"message":"Unauthorized"})
    }
    return user.updateSC2Token();
  }).then(user => {
    if (!user) {
      return;
    } else if (!user.sc2) {
      return res.sendStatus(HttpStatus.PROXY_AUTHENTICATION_REQUIRED);
    }
    res.locals.session = session;
    res.locals.user = user;
    next();
  }).catch(err => next(err));
}

export function loadMod(req: express.Request,
                        res: express.Response,
                        next: express.NextFunction) {
  const user = res.locals.user;
  if (!user) {
    return next();
  }
  Moderator.findOne({ account: user.account }).then((mod: any) => {
    if (mod && !mod.banned) {
      res.locals.moderator = mod;
    }
    next();
  }).catch(err => next(err));
}

export function requireMod(req: express.Request,
                            res: express.Response,
                            next: express.NextFunction) {
  const user = res.locals.user;
  if (!user) {
    res.status(HttpStatus.UNAUTHORIZED)
    return res.json({"message":"Unauthorized"})
  }
  Moderator.findOne({ account: user.account }).then((mod: any) => {
    if (!mod || mod.banned) {
      res.status(HttpStatus.UNAUTHORIZED);
      return res.json({"message":"Unauthorized"});
    }
    res.locals.moderator = mod;
    next();
  }).catch(err => next(err));
}

export function requireSupervisor(req: express.Request,
                            res: express.Response,
                            next: express.NextFunction) {
  const user = res.locals.user;
  if (!user) {
    res.status(HttpStatus.UNAUTHORIZED)
    return res.json({"message":"Unauthorized"})
  }
  Moderator.findOne({ account: user.account }).then((mod: any) => {
    if (!mod || mod.banned || !mod.supermoderator) {
      res.status(HttpStatus.UNAUTHORIZED);
      return res.json({"message":"Unauthorized"});
    }
    res.locals.moderator = mod;
    next();
  }).catch(err => next(err));
}
