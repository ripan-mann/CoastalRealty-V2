import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import ddfRoutes from "./routes/ddf.js";

// Data Imports
import User from "./models/User.js";
import { dataUser } from "./data/index.js";

// CONFIGURATION
dotenv.config();
const app = express();

app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

/*Routes*/
app.use("/api/ddf", ddfRoutes); /*ddf*/

/*Mongoose Setup*/
const PORT = process.env.PORT; // Default port if not specified in .env
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Server Port: ${PORT}`));
    // ONLY ADD DATA ONE TIME
    // User.insertMany(dataUser);
  })
  .catch((error) => console.log(`${error} did not connect`));
