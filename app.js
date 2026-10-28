import 'dotenv/config';
import express from 'express';
import path from 'path';
import morgan from 'morgan';
import cors from 'cors';

import authRouter from './routes/auth.js';
import bookingsRouter from './routes/bookings.js';
import brokerRouter from './routes/broker.js';
import commentsRouter from './routes/comments.js';
import resourcesRouter from './routes/resources.js';
import usersRouter from './routes/users.js';

const app = express();

// ========================================
// EXPRESS CONFIGURATION
// ========================================

app.disable('x-powered-by');
app.set('view engine');

app.use(express.static(path.join(process.cwd(), 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Logga HTTP-förfrågningar (utom vid tester)
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// ========================================
// SOCKET.IO MIDDLEWARE
// ========================================

// Gör Socket.io tillgängligt i alla routes.
// Måste ligga FÖRE API-routes.
app.use((req, res, next) => {
    req.io = app.get('io');
    next();
});

// ========================================
// API ROUTES
// ========================================

app.use('/api',
    authRouter,
    bookingsRouter,
    brokerRouter,
    commentsRouter,
    resourcesRouter,
    usersRouter
);

// ========================================
// START PAGE
// ========================================

app.get('/', (req, res) => {
    res.json({ message: 'Booking Resources API' });
});

export default app;