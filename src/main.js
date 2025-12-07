/*
import './common/dotenv.js';
import app from './app.js';
import instance from './instance.js';
import exitHook from 'exit-hook';
import config from './config.js';

const port = config.servicePort || 3000;

const server = app.listen(port, () => {
  instance.logger.info(`Server is running on port ${port}`);
});

exitHook(() => {
  instance.logger.info('Shutting down server...');
  server.close(() => {
    instance.logger.info('Server has been closed.');
    instance.mysql.end(() => {
      instance.logger.info('MySQL pool has been closed.');
    });
  });
});
*/

console.log('The main.js file is currently commented out for testing purposes.');
