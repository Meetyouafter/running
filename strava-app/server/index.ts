import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import stravaRoutes from './routes/strava.js';
import icuRoutes from './routes/icu.js';
import coachRoutes from './routes/coach.js';
import routeRoutes from './routes/route.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/strava', stravaRoutes);
app.use('/api/icu', icuRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/route', routeRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
