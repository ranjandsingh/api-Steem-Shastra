import * as mongoose from 'mongoose';
import * as https from 'https';
import * as util from 'util';
import * as fs from 'fs';

// config should be imported before importing any other file
import config from '../config/config';
import app from '../config/express';
import { start as startTasks } from './tasks';

const debug = require('debug')('api.utopian.io:index');

// make bluebird default Promise
Promise = require('bluebird'); // eslint-disable-line no-global-assign

// plugin bluebird promise in mongoose
(mongoose as any).Promise = Promise;

// connect to mongo db
mongoose.connect(config.mongo, { server: { socketOptions: { keepAlive: 1 } } });
mongoose.connection.on('error', () => {
  throw new Error(`unable to connect to database`);
});

// print mongoose logs in dev env
if (config.mongooseDebug) {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    debug(`${collectionName}.${method}`, util.inspect(query, false, 20), doc);
  });
}

// module.parent check is required to support mocha watch
// src: https://github.com/mochajs/mocha/issues/1912
if (!module.parent) {
  const port = config.server.port;
  if (config.server.cert && config.server.key) {
    const options = {
      cert: fs.readFileSync(config.server.cert),
      key: fs.readFileSync(config.server.key)
    };

    https.createServer(options, app).listen(port, () => {
      console.info(`server started on port ${port} (${config.env})`);
    });

  } else {
    app.listen(config.server.port, () => {
      console.info(`server started on port ${port} (${config.env})`);
    });
  }

  if (process.env.NODE_ENV !== 'test') {
    startTasks();
  }
}

export default app;
