import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import projectRoutes from './routes/projectRoutes.js';

const app = express();

const corsOptions = {
  methods: 'GET,HEAD,PATCH,POST,DELETE',
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());

app.use('/app/v1/users', userRoutes);
app.use('/app/v1/projects', projectRoutes);

export default app;
