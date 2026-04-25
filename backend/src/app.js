import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import router from './routes/routes.js';


const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', router);




app.get('/', (req, res) => {
  res.send('running backend ');

});
export default app;