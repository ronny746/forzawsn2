import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import httpErrors from 'http-errors';
import httpProxy from 'http-proxy';
import path from 'path';
import dotenv from 'dotenv';

import { hrModuleBackendApp, httpServer } from './helpers/common/init_socket';
import { v1 } from './helpers/common/route_versions/v1';
import { LOGGER } from './helpers/common/init_winston';
import { GlobalConfig } from './helpers/common/environment';
import logger from './helpers/service/logger';

import './helpers/common/cronJobs';

// =========================
// ENV
// =========================
dotenv.config();

// =========================
// MIDDLEWARES
// =========================
hrModuleBackendApp.use(helmet());

hrModuleBackendApp.use(
  compression({
    level: 6,
    threshold: 50 * 1000,
  })
);

// logging
const morganFormat = ':method :url :status :response-time ms';
hrModuleBackendApp.use(
  morgan(morganFormat, {
    stream: {
      write: (message: string): void => {
        const [method, url, status, responseTime] = message.split(' ');
        logger.info(
          JSON.stringify({
            method,
            url,
            status,
            responseTime,
          })
        );
      },
    },
  })
);

// =========================
// CORS (PROD SAFE)
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
// BODY & COOKIES
// =========================
hrModuleBackendApp.use(express.json());
hrModuleBackendApp.use(express.urlencoded({ extended: true }));
hrModuleBackendApp.use(cookieParser(GlobalConfig.APP_COOKIE_SECRET));

// =========================
// STATIC FILES
// =========================

// images & public
hrModuleBackendApp.use(
  '/public',
  express.static(
    path.join(__dirname, '../../wsn3.workgateway.in/public')
  )
);

// react build
hrModuleBackendApp.use(
  express.static(path.join(__dirname, '../../WSN3'))
);

// react entry
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
((port: number): void => {
  try {
    httpServer.listen(port, () => {
      console.log('Express Application Running on Port', port);
    });
  } catch (error) {
    console.error('Unable to start Express Server:', error);
    process.exit(1);
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
