import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import express from 'express';
import httpErrors from 'http-errors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import httpProxy from 'http-proxy';
import path from 'path';

import { hrModuleBackendApp, httpServer } from './helpers/common/init_socket';
import { v1 } from './helpers/common/route_versions/v1';
import { LOGGER } from './helpers/common/init_winston';
import { GlobalConfig } from './helpers/common/environment';
import logger from './helpers/service/logger';

import './helpers/common/cronJobs';

require('dotenv').config();

// =========================
// MIDDLEWARES
// =========================

// Security headers
hrModuleBackendApp.use(helmet());

// Compression
hrModuleBackendApp.use(
  compression({
    level: 6,
    threshold: 50 * 1000,
  })
);

// Logging
const morganFormat = ':method :url :status :response-time ms';
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

// =========================
// CORS (FIXED)
// =========================
hrModuleBackendApp.use(
  cors({
    origin: [
      'https://wsn3.workgateway.in',
      'https://www.wsn3.workgateway.in',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// =========================
// BODY / COOKIES
// =========================
hrModuleBackendApp.use(express.json());
hrModuleBackendApp.use(express.urlencoded({ extended: true }));
hrModuleBackendApp.use(cookieParser(GlobalConfig.APP_COOKIE_SECRET));

// =========================
// STATIC FILES
// =========================

// Serve images & public files
hrModuleBackendApp.use(
  '/public',
  express.static(path.join(__dirname, '../../wsn3.workgateway.in/public'))
);

// Serve React build
hrModuleBackendApp.use(
  express.static(path.join(__dirname, '../../WSN3'))
);

// React entry
hrModuleBackendApp.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../WSN3', 'index.html'));
});

// =========================
// API PROXY
// =========================
const proxy = httpProxy.createProxyServer();

hrModuleBackendApp.use('/api', (req, res) => {
  proxy.web(req, res, { target: 'http://14.99.179.131:80' });
});

// =========================
// ROUTES
// =========================
hrModuleBackendApp.use('/v1', v1);

// =========================
// 404 HANDLER
// =========================
hrModuleBackendApp.use((req, _res, next) => {
  next(httpErrors.NotFound(`Route not Found for [${req.method}] ${req.url}`));
});

// =========================
// SERVER START
// =========================
((port) => {
  try {
    httpServer.listen(port, () => {
      console.log('Express Application Running on Port', port);
    });
  } catch (error) {
    console.error('Unable to start Express Server:', error);
    process.exit(0);
  }
})(GlobalConfig.APP_PORT || 3500);

// =========================
// PROCESS HANDLERS
// =========================
process.on('SIGINT', () => {
  setTimeout(() => {
    LOGGER.warn('Application terminated successfully.');
    process.exit(0);
  }, 500);
});

process.on('uncaughtException', (error) => {
  LOGGER.error(`Uncaught Exception Occurred\n${error}`);
});
