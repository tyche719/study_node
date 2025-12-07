import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';

import diaryRouter from './routes/diary.router.js';
import instance from './instance.js';

const app = express();

app.use(morgan('combined', { stream: instance.logger.stream }));
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride());

app.use('/diaries', diaryRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).send('Sorry, that route does not exist.');
});

// Error handler
app.use((err, req, res, next) => {
  instance.logger.error(err.stack);
  res.status(500).send('Something broke!');
});

export default app;
