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
require('dotenv');

const proxy = httpProxy.createProxyServer();
const morganFormat = ':method :url :status :response-time ms';

// ===== CORS Configuration - Complete Solution =====
const corsOptions = {
  // सभी origins को allow करो
  origin: true, // या '*' लिख सकते हो
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
  maxAge: 86400,
  optionsSuccessStatus: 200 // कुछ legacy browsers के लिए
};

// Activate Middlewares
hrModuleBackendApp.use(helmet());

// CORS को सबसे पहले लगाओ (helmet से पहले भी हो सकता है)
hrModuleBackendApp.use(cors(corsOptions));

// Manual CORS headers भी add करो extra safety के लिए
hrModuleBackendApp.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization');
  
  // Preflight request को handle करो
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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

hrModuleBackendApp.use(express.json({ limit: '50mb' }));
hrModuleBackendApp.use(express.urlencoded({ extended: true, limit: '50mb' }));
hrModuleBackendApp.use(cookieParser(GlobalConfig.APP_COOKIE_SECRET));

hrModuleBackendApp.use('/public', express.static(path.join(__dirname, '../../wsn3.workgateway.in/public')));
hrModuleBackendApp.use(express.static(path.join(__dirname, '../../WSN3')));

hrModuleBackendApp.get('/', (req, res) => {
  console.log(req)
  res.sendFile(path.join(__dirname, '../../WSN3', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
  hrModuleBackendApp.use(morgan('dev'));
}

// Proxy requests to the backend server
hrModuleBackendApp.use('/api', (req, res) => {
  proxy.web(req, res, { target: 'http://14.99.179.131:80' });
});

// Error handler for proxy
proxy.on('error', (err, _req, res) => {
  console.error('Proxy error:', err);
  res.writeHead(502, {
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify({ error: 'Bad Gateway' }));
});

hrModuleBackendApp.use('/v1', v1);

// Setup Error Handler for unhandled Route Requests
hrModuleBackendApp.use(async (req, _res, next) => {
  next(httpErrors.NotFound(`Route not Found for [${req.method}] ${req.url}`));
});

((hrModuleBackendAppPort): void => {
  try {
    httpServer.listen(hrModuleBackendAppPort, async () => {
      try {
        console.log(`Express Application Running on Port ${hrModuleBackendAppPort}`);
        console.log('CORS Enabled for all origins');
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