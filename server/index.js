import 'dotenv/config';
import express from 'express';
import mainRouter from './routes/index.js';
import { test, testandsync } from './db/index.js';
import startPaieCron from './cron/paie.cron.js';


startPaieCron()

const app = express();
app.use(express.json());

app.use('/api' , mainRouter)

app.get('/migrate', async (req , res) => {
    await testandsync()
    return res.status(200).json('done')

})



app.listen(3000, () => {
    console.log('we hear you!')
})