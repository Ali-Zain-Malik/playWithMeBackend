import 'dotenv/config';
import express from "express";
import cors from "cors";

import connectDB from './config/database.js';
import { sendJsonResponse } from './middlewares/json.js';
import auth from './middlewares/auth.js';
import routes from './config/routes.js';

const app = express();

connectDB();

app.use(sendJsonResponse);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Auth Routes
app.use("/api", routes);


export default app;