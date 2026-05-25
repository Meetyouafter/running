import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import stravaRoutes from './routes/strava.js';
import icuRoutes from './routes/icu.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/strava', stravaRoutes);
app.use('/api/icu', icuRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
