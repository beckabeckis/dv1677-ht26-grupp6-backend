import 'dotenv/config';
import express from 'express';
import path from 'path';
import morgan from 'morgan';
import cors from 'cors';
import routes from './routes.mjs';

import { connectToDatabase } from "./db/database.mjs";


const port = process.env.PORT;
const app = express();

app.disable('x-powered-by');
app.set("view engine", "ejs");
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

connectToDatabase().then(() => {
    app.listen(port, () => console.log(`API listening on port ${port}`));
});

if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: 'Booking Resources API' });
});
