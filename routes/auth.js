import express from 'express';
import { register, login } from '../controllers/authController.js'

const authRouter = express.Router();

// POST register new user
authRouter.post('/auth/register', register)

// POST login user
authRouter.post('/auth/login', login)


export default authRouter;