/**
 * Environment Variable Loader for Local Development
 *
 * This module loads environment variables from .env.local when running locally.
 * On Vercel (production/preview), environment variables are injected automatically.
 *
 * This is a workaround for `vercel dev` on Windows not properly loading .env.local
 * for serverless functions.
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Only load dotenv in development - Vercel sets these in production
if (!process.env.VERCEL) {
  config({ path: resolve(process.cwd(), '.env.local') });
}
