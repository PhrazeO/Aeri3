const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const port = 5000;

// MongoDB URI and database configuration
const uri = 'mongodb+srv://UserAeri:GdgnafdurZLhEkw6@cluster0.qiookc8.mongodb.net/';
const dbName = 'Tradegame';
const collectionName = 'forextable';
const collectionName2 = 'users';

// JWT Secret
const JWT_SECRET = 'your_jwt_secret_key'; // Replace with your own secret

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

// User Registration
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName2);
    const hashedPassword = await bcrypt.hash(password, 10);

    await collection.insertOne({ email, password: hashedPassword });
    res.status(201).send('User registered successfully');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName2);
    const user = await collection.findOne({ email });

    if (user && await bcrypt.compare(password, user.password)) {
      // Generate a JWT token
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ token }); // Send the token to the client
    } else {
      res.status(401).send('Invalid email or password');
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});

// User Logout
app.post('/api/logout', (req, res) => {
  // Since JWT is stateless, no need to handle server-side logout
  res.status(200).send('Logout successful');
});

// Check Current User
app.get('/api/current_user', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Get the token from "Bearer token"

  if (!token) {
    return res.status(401).send('Not authenticated');
  }

  let client;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName2);
    const user = await collection.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.status(200).json({ email: user.email });
  } catch (error) {
    console.error('Error verifying token or fetching user:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// New Endpoint to Fetch User Details
app.get('/api/user', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Get the token from "Bearer token"

  if (!token) {
    return res.status(401).send('Not authenticated');
  }

  let client;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName2);
    const user = await collection.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.status(200).json({ username: user.username }); // You can adjust this if the username is stored differently
  } catch (error) {
    console.error('Error verifying token or fetching user:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    if (client) {
      await client.close();
    }
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
