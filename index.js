const express = require('express');
const cors = require('cors');
const mongodb = require('module');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.eptog.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// VERIFY TOKEN
const verifyToken = (req, res, next) => {
  const authToken = req.headers.authorization;
  if (!authToken) {
    return res.status(401).send({ msg: 'Unauthorization access' });
  } else {
    const token = authToken.split(' ')[1];
    jwt.verify(token, process.env.SECRET_ACCESS_TOKEN, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' });
      } else {
        req.decoded = decoded;
        next();
      }
    });
  }
};

async function run() {
  try {
    await client.connect();
    const inventoryCollection = client.db('products').collection('inventory');

    // access token generate
    app.post('/token', async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_ACCESS_TOKEN, {
        expiresIn: '1d',
      });
      res.send({ token });
    });

    // INSERT
    app.post('/addInventory', async (req, res) => {
      const item = req.body;
      const result = await inventoryCollection.insertOne(item);
      res.send(result);
    });

    //GET ALL INVENTORY
    app.get('/inventorys', async (req, res) => {
      const query = {};
      const cursor = inventoryCollection.find(query);
      const inventorys = await cursor.toArray();
      res.send(inventorys);
    });

    //GET INVENTORY
    app.get('/inventory', async (req, res) => {
      const query = {};
      const cursor = inventoryCollection.find(query);
      const inventorys = await cursor.limit(6).toArray();
      res.send(inventorys);
    });

    // GET DATA WITH ID
    app.get('/inventory/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await inventoryCollection.findOne(query);
      res.send(result);
    });

    // INCREASE QUANTITY !
    app.post('/inventoryRestore/:id', async (req, res) => {
      const id = req.params.id;
      const amount = req.body.quantity;
      const query = { _id: ObjectId(id) };
      const inventory = await inventoryCollection.findOne(query);
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          quantity: +inventory.quantity + amount,
        },
      };
      const result = await inventoryCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // DECREASE QUANTITY !
    app.post('/inventoryDelevered/:id', async (req, res) => {
      const id = req.params.id;
      const amount = req.body.quantity;
      const query = { _id: ObjectId(id) };
      const inventory = await inventoryCollection.findOne(query);
      const options = { upsert: true };

      const updateDoc = {
        $set: {
          quantity: +inventory.quantity >= 1 ? +inventory.quantity - amount : 0,
        },
      };
      const result = await inventoryCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // DELETE
    app.delete('/delete/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await inventoryCollection.deleteOne(query);
      res.send(result);
    });

    // FIND ITEM BY EMAIL
    app.get('/myItem', verifyToken, async (req, res) => {
      const tokenEmail = req.decoded.email;
      const email = req.query.email;
      if (tokenEmail === email) {
        const query = { email };
        const cursor = inventoryCollection.find(query);
        const result = await cursor.toArray();
        res.send(result);
      } else {
        return res.status(403).send({ message: 'Forbidden access' });
      }
    });
  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('running');
});

app.listen(port, () => {
  console.log('Server is runing', port);
});
