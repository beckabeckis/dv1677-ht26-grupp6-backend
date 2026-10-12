import 'dotenv/config';
import express from 'express';
import path from 'path';
import morgan from 'morgan';
import cors from 'cors';
import routes from './routes/routes.mjs';
import authRouter from './routes/auth.js';
import bookingRouter from './routes/bookings.js';

const app = express();

app.disable('x-powered-by');
app.set('view engine');

app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

app.use('/api', routes, authRouter, bookingRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Booking Resources API' });
});

export default app;