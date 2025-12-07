/**
 * @file
 * @lastModified 2024-09-14
 */

import tracer from 'tracer';
import mysql from 'mysql2/promise';
import { createClient } from 'redis';

import config from './config.js';

/**
 * 각각에서 사용할 인스턴스들을 관리하는 클래스입니다.
 * @class
 */
class Instance {
  constructor() {
    this.logger = tracer.console({
      level: config.logLevel,
      format: [
        '{{timestamp}} [{{title}}] {{message}} (in {{file}}:{{line}})',
        {
          error: '{{timestamp}} [{{title}}] {{message}} (in {{file}}:{{line}})\nCall Stack:\n{{stack}}'
        }
      ]
    });
    this.mysql = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.passwd,
      database: config.mysql.name,
      waitForConnections: true,
      connectionLimit: config.mysql.poolCount,
      queueLimit: 0
    });
    this.redis = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.passwd || null
      }
    });
  }
}

export default new Instance();
