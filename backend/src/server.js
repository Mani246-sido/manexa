import dotenv from 'dotenv';
dotenv.config();
import app from './app.js';
import connectDB from './config/mongo.js';
import { verifyMailer } from './config/mail.js';

import { connectmysql } from './config/mysql.js';

const PORT = process.env.PORT || 5000;

const servertry = async () => {
 try {
     await connectDB();
     await connectmysql();
     await verifyMailer();

     
     app.listen(PORT, () => {
       console.log(`Server running on port ${PORT}`);
       });
 } catch (error) {
    console.error(`Error: ${error.message}`);
  process.exit(1);
    
 }
}
servertry();
