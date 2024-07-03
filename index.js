const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// This is your test secret API key.
const stripe = require("stripe")(
  "sk_test_51POGSPP1lGcxAMynS9iLHhCaJWcDUED2pVoZrpuP6NCEr8iFQ51XUc2UAbOmHOZ5nluqORJCE19zjuiQBTkgAWTl00KJSYVS5L"
);

// Middleware
app.use(
  cors({
    origin: ["https://b9-battle-for-supremacy.web.app",'http://localhost:5173'],
    credentials: true,
  })
);
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3i9ecp5.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server
    // await client.connect();

    const blogCollection = client.db("newspaper").collection("blog");
    const usersCollection = client.db("newspaper").collection("user");
    const publisherCollection = client.db("newspaper").collection("publisher");

    app.get("/blog", async (req, res) => {
      const cursor = blogCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.post("/blog", async (req, res) => {
      const newProduct = req.body;
      const result = await blogCollection.insertOne(newProduct);
      res.send(result);
    });

    // delete a blog
    app.delete("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.deleteOne(query);
      res.send(result);
    });

    // publisher add
    app.post("/publishers", async (req, res) => {
      const newProduct = req.body;
      const result = await publisherCollection.insertOne(newProduct);
      res.send(result);
    });

    app.get("/publishers", async (req, res) => {
      const cursor = publisherCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // Save a user data in db
    app.put("/user", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const options = { upsert: true };
      const updateDoc = {
        $set: { ...user },
      };

      const isExist = await usersCollection.findOne(query);
      if (isExist) {
        if (user.status === "Requested") {
          const result = await usersCollection.updateOne(query, {
            $set: { status: user?.status },
          });
          return res.send(result);
        } else {
          return res.send(isExist);
        }
      }

      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    app.get("/user", async (req, res) => {
      const cursor = usersCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // make admin api
    app.patch("/user/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // make Premium api
    app.patch("/blog/premium/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: "premium",
        },
      };
      const result = await blogCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // blog update
    app.patch("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const blog = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ...blog,
        },
      };

      try {
        const result = await blogCollection.updateOne(filter, updateDoc);
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "Blog not found" });
        }
        res.send(result);
      } catch (error) {
        console.error("Error updating blog:", error);
        res.status(500).send({ message: "Failed to update blog", error });
      }
    });

    // user update
    app.patch("/user/:id", async (req, res) => {
      const id = req.params.id;
      const user = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          ...user,
        },
      };

      try {
        const result = await usersCollection.updateOne(filter, updateDoc);
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "user not found" });
        }
        res.send(result);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send({ message: "Failed to update user", error });
      }
    });

    // make paid user
    app.patch("/user/paid/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: "paid",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // make blogs Approved api
    app.patch("/blog/approved/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approve",
        },
      };
      const result = await blogCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // make blogs Decline api
    app.patch("/blog/decline/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "Decline",
        },
      };
      const result = await blogCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // added to pagination get data
    app.get("/allblog", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search || "";
      const publisher = req.query.publisher || "";
      let query = {};
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      if (filter) {
        query.tag = filter;
      }
      if (publisher) {
        query.publisher = publisher;
      }

      try {
        const result = await blogCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send("Error fetching blogs");
      }
    });

    // blog count Update
    app.put("/blog/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const { count: newCount } = req.body;
        const query = { _id: new ObjectId(id) };
        const doc = await blogCollection.findOne(query);
        const updatedCount = doc.count + parseInt(newCount);
        const updateDoc = {
          $set: { count: updatedCount },
        };
        const result = await blogCollection.updateOne(query, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating count:", error);
        res.status(500).send("Internal Server Error");
      }
    });

    // payment intent create
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      if (!price) {
        return res.status(400).send({ error: "Price is required" });
      }
      const amount = parseInt(price); // Stripe requires the amount to be in cents
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error("Error creating payment intent:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // You can close the client connection here if you do not want to keep it open
    // await client.close();
  }
}

run().catch(console.dir);

// Root route
app.get("/", (req, res) => {
  res.send("Blog Running");
});

app.listen(port, () => {
  console.log(`Blog server running on port: ${port}`);
});
