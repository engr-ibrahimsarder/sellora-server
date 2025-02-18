const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = 5000;

// middlaware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.g9pve.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    await client.connect();
    const productCollection = client.db("Sellora").collection("products");
    // all products get from database
    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });
    app.get("/products/:productId", async (req, res) => {
      const id = req.params.productId;
      const query = { _id: new ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    //   await client.close();
  }
}
run().catch(console.dir);
app.get("/", async (req, res) => {
  res.send("Sellora server is running....");
});
app.listen(port, () => {
  console.log(`example app listening on ${port}`);
});
