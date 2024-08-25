const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const port = 5000;

// MongoDB URI and database configuration
const uri = 'mongodb+srv://UserAeri:GdgnafdurZLhEkw6@cluster0.qiookc8.mongodb.net/';
const dbName = 'DBA';
const collectionName = 'countries';
const collectionName2 = 'users';
const collectionName3 = 'vacatures';

// JWT Secret
const JWT_SECRET = 'your_jwt_secret_key'; // Replace with your own secret

// Middleware
app.use(cors());
app.use(express.json());

// User Registration
app.post('/api/register', async (req, res) => {
  const { email, password, name, age } = req.body;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName2);

    // Check if user with the same email already exists
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
    await collection.insertOne({
      email,
      password: hashedPassword,
      name,
      age,
      quizScores: [] // Initialize quizScores as an empty array
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Internal Server Error' });
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

app.post('/api/save-score', async (req, res) => {
  const { quizName, score, date } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Not authenticated');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection(collectionName2);

    const userId = new ObjectId(decoded.userId);

    const result = await usersCollection.updateOne(
      { _id: userId },
      { 
        $push: { 
          quizzes: { 
            quizName, 
            score, 
            date 
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send('User not found');
    }

    res.status(200).send('Score updated successfully');
  } catch (error) {
    console.error('Error saving score:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 

app.post('/api/save-vacature', async (req, res) => {
  const { vacatureidnumber, date } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Not authenticated');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection(collectionName2);

    const userId = new ObjectId(decoded.userId);

    // Fetch the user document
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Check if vacatureidnumber is already in savedVacatures
    const isAlreadySaved = user.savedVacatures.some(vacature => vacature.vacatureidnumber === vacatureidnumber);

    if (isAlreadySaved) {
      return res.status(400).send('Vacature already saved');
    }

    // Add the new vacature to savedVacatures
    const result = await usersCollection.updateOne(
      { _id: userId },
      { 
        $push: { 
          savedVacatures: { 
            vacatureidnumber, 
            date 
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send('User not found');
    }

    res.status(200).send('Vacature saved successfully');
  } catch (error) {
    console.error('Error saving vacature:', error);
    res.status(500).send('Internal Server Error');
  }
});
//

app.post('/api/toggle-save-vacature', async (req, res) => {
  const { vacatureidnumber, date } = req.body;
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Not authenticated');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection(collectionName2);

    const userId = new ObjectId(decoded.userId);

    // Fetch the user document
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Check if vacatureidnumber is already in savedVacatures
    const isAlreadySaved = user.savedVacatures.some(vacature => vacature.vacatureidnumber === vacatureidnumber);

    if (isAlreadySaved) {
      // Remove the vacature from savedVacatures
      const result = await usersCollection.updateOne(
        { _id: userId },
        { $pull: { savedVacatures: { vacatureidnumber } } }
      );
      if (result.matchedCount === 0) {
        return res.status(404).send('User not found');
      }
      res.status(200).send('Vacature removed successfully');
    } else {
      // Add the new vacature to savedVacatures
      const result = await usersCollection.updateOne(
        { _id: userId },
        { 
          $push: { 
            savedVacatures: { 
              vacatureidnumber, 
              date 
            }
          }
        }
      );
      if (result.matchedCount === 0) {
        return res.status(404).send('User not found');
      }
      res.status(200).send('Vacature saved successfully');
    }
  } catch (error) {
    console.error('Error toggling vacature:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Backend: Check if a vacature is saved for the logged-in user
app.get('/api/check-saved-vacature/:vacatureId', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  const { vacatureId } = req.params;

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

    const user = await collection.findOne({
      _id: new ObjectId(decoded.userId),
      'savedVacatures.vacatureId': vacatureId, // Check if the vacatureId is in the savedVacatures array
    });

    if (user) {
      return res.status(200).json({ saved: true });
    } else {
      return res.status(200).json({ saved: false });
    }
  } catch (error) {
    console.error('Error fetching saved vacature:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    if (client) {
      await client.close();
    }
  }
});
//
// Backend endpoint to get saved vacatures
app.get('/api/saved-vacatures', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Not authenticated');
  }

  let client;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection(collectionName2);
    const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.status(200).json(user.savedVacatures || []);
  } catch (error) {
    console.error('Error verifying token or fetching saved vacatures:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    if (client) {
      await client.close();
    }
  }
});




//
app.get('/api/user-quizzes', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Not authenticated');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    const usersCollection = db.collection(collectionName2);

    const userId = new ObjectId(decoded.userId);
    const user = await usersCollection.findOne({ _id: userId });

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.status(200).json(user.quizzes || []);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Fetch Country Data from MongoDB
app.get('/api/countries', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const countries = await collection.find().toArray(); // Fetch all countries from the collection
    res.status(200).json(countries);
  } catch (error) {
    console.error('Error fetching country data:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
  }
});



app.get('/api/vacatures', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collectionName3);

    const vacatures = await collection.find().toArray(); // Fetch all vacatures from the collection
    console.log('Vacatures fetched:', vacatures); // Add this line to log the fetched data
    res.status(200).json(vacatures);
  } catch (error) {
    console.error('Error fetching vacature data:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    await client.close();
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

    res.status(200).json({ username: user.username, quizScores: user.quizScores });
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
