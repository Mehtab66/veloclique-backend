import mongoose from 'mongoose';
import dotenv from 'dotenv';
import GearPick from './models/gearpick.model.js';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const approvedPicks = await GearPick.find({ status: 'approved' }).limit(3).lean();
        console.log('--- Approved Picks ---');
        approvedPicks.forEach(p => {
            console.log(`ID: ${p._id}`);
            console.log(`Name: ${p.gearName}`);
            console.log(`Image: ${JSON.stringify(p.image)}`);
            console.log(`Images: ${JSON.stringify(p.images)}`);
            console.log('---');
        });

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

run();
