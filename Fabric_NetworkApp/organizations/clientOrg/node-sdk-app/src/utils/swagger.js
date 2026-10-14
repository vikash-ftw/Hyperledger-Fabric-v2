"use strict";

import swaggerAutogen from 'swagger-autogen';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 

const autogen = swaggerAutogen({ openapi: '3.0.0' });

const doc = {
  info: {
    title: 'Fabric Blockchain Application API',
    description: 'API documentation for the Fabric Node SDK backend application',
    version: '1.0',
  },
  host: `localhost:${process.env.PORT}`,
  schemes: ['http'],
};

// Step up one directory to 'src/' and generate the file there
const outputFile = path.join(__dirname, '..', 'swagger-output.json');

// Step up one directory to 'src/', then look for app.js
const endpointsFiles = [path.join(__dirname, '..', 'app.js')];

autogen(outputFile, endpointsFiles, doc);