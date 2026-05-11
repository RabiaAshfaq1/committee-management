'use strict';
/**
 * Vercel invokes this handler for all traffi (see vercel.json rewrites).
 * Loads the compiled Express app from dist/.
 */
require('dotenv/config');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mod = require('../dist/index.js');
module.exports = mod.default ?? mod;
