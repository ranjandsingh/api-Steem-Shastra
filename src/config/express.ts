import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as compress from 'compression';
import * as methodOverride from 'method-override';
import * as cors from 'cors';
import * as httpStatus from 'http-status';
import * as expressWinston from 'express-winston';
import * as expressValidation from 'express-validation';
import * as helmet from 'helmet';
import * as util from 'util';
import * as dsteem from 'dsteem'

import winstonInstance from './winston';
import routes from '../server/routes/index.route';
import APIError from '../server/helpers/APIError';
import config from './config';

export const client = process.env.REG_TESTNET === 'false' ? new dsteem.Client('https://api.steemit.com') : dsteem.Client.testnet()
//export const client = dsteem.Client.testnet() // For now the testnet

const app = express();

// parse body params and attache them to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(compress());
app.use(methodOverride());

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// enable basic logging
expressWinston.requestWhitelist.push('body');
expressWinston.responseWhitelist.push('body');
app.use(expressWinston.logger({
  winstonInstance,
  meta: false,
  msg: 'HTTP {{req.ip}} {{res.statusCode}} {{req.method}} '
        + '{{res.responseTime}}ms {{req.url}}',
  colorStatus: true
}));

// mount all routes on /api path
app.use('/api', routes);

// if error is not an instanceOf APIError, convert it.
app.use((err, req, res, next) => {
  if (err instanceof expressValidation.ValidationError) {
    // validation error contains errors which is an array of error each containing message[]
    const unifiedErrorMessage = err.errors.map(error => error.messages.join('. ')).join(' and ');
    const error = new APIError(unifiedErrorMessage, err.status, true);
    return next(error);
  } else if (!(err instanceof APIError)) {
    const apiError = new APIError(err.message, err.status, err.isPublic);
    return next(apiError);
  }
  return next(err);
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new APIError('API not found', httpStatus.NOT_FOUND);
  return next(err);
});

// error handler, send stacktrace only during development
app.use((err, req: express.Request, res, next) => {
  if (err.status !== httpStatus.NOT_FOUND) {
    winstonInstance.error('Error processing HTTP request',
                            '\nError: ', err.message, err.stack,
                            '\nRequest URL: ', req.originalUrl,
                            '\nRequest body: ', req.body);
  }
  res.status(err.status).json({
    message: err.isPublic ? err.message : httpStatus[err.status],
    stack: config.env === 'development' ? err.stack : {}
  })
});

export default app;
