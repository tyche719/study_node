/**
 * @file
 * @lastModified 2024-09-16
 */

class Config {
  constructor() {
    this.env = process.env.NODE_ENV;

    this.isMasterProcess = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE == 0;

    this.logLevel = process.env.LOG_LEVEL;

    this.serviceTitle = process.env.TITLE;
    this.servicePort = process.env.PORT;
    this.serviceCorsAllowServer = process.env.CORS_ALLOW_SERVER;

    this.swaggerUrl = process.env.SWAGGER_URL;

    this.tokenName = process.env.TOKEN_NAME;
    this.secretKey = process.env.SECRET_KEY;

    this.mysql = {
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      name: process.env.MYSQL_NAME,
      user: process.env.MYSQL_USER,
      passwd: process.env.MYSQL_PASSWORD,
      poolCount: process.env.MYSQL_POOLCOUNT
    };

    this.redis = {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      passwd: process.env.REDIS_PASSWD,
      expirettl: process.env.REDIS_EXPIRETTL_SEC
    };
  }
}

export default new Config();
