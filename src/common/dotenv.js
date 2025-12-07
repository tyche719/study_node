/**
 * @file
 * @lastModified 2024-09-06
 */
import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';

function loadEnv(envFile) {
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  if (fs.existsSync(envFile)) {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    const envConfig = dotenv.parse(fs.readFileSync(envFile));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  }
}

// 먼저 기본 .env 파일 로드
loadEnv(path.resolve(process.cwd(), '.env'));

// 그 다음 .env.production 파일 로드 (있다면 덮어씁니다)
if (process.env.NODE_ENV === 'production') {
  loadEnv(path.resolve(process.cwd(), '.env.production'));
}
