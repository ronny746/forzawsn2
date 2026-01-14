// import fs from 'fs';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import express from 'express';
import httpErrors from 'http-errors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { hrModuleBackendApp, httpServer } from './helpers/common/init_socket';
import { v1 } from './helpers/common/route_versions/v1';
import { LOGGER } from './helpers/common/init_winston';
import { GlobalConfig } from './helpers/common/environment'
import httpProxy from 'http-proxy';
import './helpers/common/cronJobs';
import path from 'path';
import logger from './helpers/service/logger';
// connectToMongo()
require('dotenv');

// Create a proxy server
const proxy = httpProxy.createProxyServer();
const morganFormat = ':method :url :status :response-time ms';

// Activate Middlewares
hrModuleBackendApp.use(helmet());
hrModuleBackendApp.use(
  compression({
    level: 6,
    threshold: 50 * 1000,
    filter: (req, res) => {
      return req.headers['request-no-compression'] ? false : compression.filter(req, res);
    }
  })
);

hrModuleBackendApp.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(' ')[0],
          url: message.split(' ')[1],
          status: message.split(' ')[2],
          responseTime: message.split(' ')[3],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

hrModuleBackendApp.use(express.json());
hrModuleBackendApp.use(express.urlencoded({ extended: true }));
hrModuleBackendApp.use(cookieParser(GlobalConfig.APP_COOKIE_SECRET));
hrModuleBackendApp.use(
  cors()
);

hrModuleBackendApp.use('/public', express.static(path.join(__dirname, '../../wsn3.workgateway.in/public')));
hrModuleBackendApp.use(function (_req, res, next) {
  res.header('Content-Type', 'application/json;charset=UTF-8');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
hrModuleBackendApp.use(function (_req, res, next) {
  res.header('Content-Type', 'application/json;charset=UTF-8');
  res.header('Access-Control-Allow-Origin', _req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Number');
  
  // Preflight request को handle करो
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});


// Serve static files from the "public" directory
hrModuleBackendApp.use(express.static(path.join(__dirname, '../../WSN3')));

hrModuleBackendApp.get('/', (req, res) => {
  console.log(req)
  res.sendFile(path.join(__dirname, '../../WSN3', 'index.html'));
});

// Displaying Service Request in Console
if (process.env.NODE_ENV !== 'production') {
  hrModuleBackendApp.use(morgan('dev'));
}

// Proxy requests to the backend server
hrModuleBackendApp.use('/api', (req, res) => {
  // Forward the request to the backend server
  proxy.web(req, res, { target: 'http://14.99.179.131:80' });
});

hrModuleBackendApp.use('/v1', v1);

// Setup Error Handler for unhandled Route Requests.
hrModuleBackendApp.use(async (req, _res, next) => {
  next(httpErrors.NotFound(`Route not Found for [${req.method}] ${req.url}`));
});

((hrModuleBackendAppPort): void => {
  try {
    httpServer.listen(hrModuleBackendAppPort, async () => {
      try {

        console.log(
          `Express Application Running on Port`,
          hrModuleBackendAppPort
        );

      } catch (error: any) {
        console.error('Error :', error.message);
        process.exit(0);
      }
    });
  } catch (error: any) {
    console.error(`Unable to start Express Server. Error : ${error}`);
    process.exit(0);
  }
})(GlobalConfig.APP_PORT || 3500);

process.on('SIGINT', () => {
  setTimeout(() => {
    LOGGER.warn('Application terminated successfully.');
    process.exit(0);
  }, 500);
});

process.on('uncaughtException', error => {
  LOGGER.error(`Uncaught Exception Occurred\n${error}`);
});
