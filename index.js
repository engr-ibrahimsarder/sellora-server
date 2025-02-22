const express = require("express");
const app = express();
const SSLCommerzPayment = require("sslcommerz-lts");
const cors = require("cors");
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  Timestamp,
} = require("mongodb");
require("dotenv").config();
const port = 5000;

// middlaware
app.use(express.json());
app.use(cors());

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false; //true for live, false for sandbox

const uri = `mongodb+srv://user_db:admin123@cluster0.g9pve.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
    const userCollection = client.db("Sellora").collection("users");
    const productCollection = client.db("Sellora").collection("products");
    const cartCollection = client.db("Sellora").collection("carts");
    const orderCollection = client.db("Sellora").collection("orders");

    // sslcommerz payment getway
    const tran_id = new ObjectId().toString();
    app.post("/order", async (req, res) => {
      const product = req.body;
      const data = {
        total_amount: product[0].price,
        currency: "USD",
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `https://sellora-server.vercel.app/payment/success/${tran_id}`,
        fail_url: `https://sellora-server.vercel.app/payment/fail/${tran_id}`,
        cancel_url: "http://localhost:3030/cancel",
        ipn_url: "http://localhost:3030/ipn",
        shipping_method: "Courier",
        product_name: product[0].name,
        product_category: "Electronic",
        product_profile: product[0].img,
        cus_name: "Customer Name",
        cus_email: "customer@example.com",
        cus_add1: product[0].address,
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
      };

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL });
        const finalOrder = {
          productName: product[0].name,
          address: product[0].address,
          price: product[0].price,
          img: product[0].img,
          productId: product[0]._id,
          paidStatus: false,
          tranjectionId: tran_id,
        };
        const result = orderCollection.insertOne(finalOrder);
      });
      // payment success method
      app.post("/payment/success/:tranId", async (req, res) => {
        const result = await orderCollection.updateOne(
          { tranjectionId: req?.params?.tranId },
          {
            $set: {
              paidStatus: true,
            },
          }
        );
        if (result.modifiedCount > 0) {
          res.redirect(
            `https://sellora25.netlify.app/payment/success/${req?.params?.tranId}`
          );
        }
      });
      // order trajectionfail delete order
      app.post("/payment/fail/:tranId", async (req, res) => {
        const result = await orderCollection.deleteOne({
          tranjectionId: req.params.tranId,
        });
        if (result.deletedCount) {
          res.redirect(
            `https://sellora25.netlify.app/payment/fail/${req?.fail?.tranId}`
          );
        }
        // console.log(req.params.tranId);
      });
    });

    // user Create
    app.post("/users", async (req, res) => {
      const user = req.body;
      // const query = { email: user.email };
      // const existingUser = await userCollection.findOne(query);
      // if (existingUser) {
      //   return res.send({ message: "user already exists", insertedId: null });
      // }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    app.patch("/users/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { email: id };
      // console.log(query);
      const updatedDoc = {
        $set: {
          name: `${user.firstName} ${user.lastName}`,
          userName: user.userName,
          address: user.address,
          phone: user.phone,
          address: user.address,
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    app.get("/users/:id", async (req, res) => {
      const userEmail = req.params.id;
      const filter = { email: userEmail };
      const result = await userCollection.findOne(filter);
      res.send(result);
    });
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

    app.post("/carts", async (req, res) => {
      const cart = req.body;
      const result = await cartCollection.insertOne(cart);
      res.send(result);
    });
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    app.get("/orders/:id", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await orderCollection.find(query).toArray();
      res.send(result);
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
