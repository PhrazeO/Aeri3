const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const port = 5000;

// MongoDB URI and database configuration
const uri = 'mongodb+srv://UserAeri:GdgnafdurZLhEkw6@cluster0.qiookc8.mongodb.net/';
const dbName = 'Tradegame';
const collectionName = 'forextable';
const collectionName2 = 'users';

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB and fetch currency pairs
app.get('/api/currency-pairs', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);
    const currencyPairs = await collection.find({}).toArray();
    res.json(currencyPairs);
  } catch (error) {
    console.error('Error fetching data from MongoDB:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
