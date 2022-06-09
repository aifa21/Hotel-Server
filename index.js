const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const ObjectID = require('mongodb').ObjectID;
const admin = require("firebase-admin");
require("dotenv").config();
const app = express();
const MongoClient = require("mongodb").MongoClient;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.xu8lv.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;

const port = process.env.PORT||5000;

const serviceAccount = JSON.parse(process.env.FIRE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith('Bearer ')) {
      const token = req.headers.authorization.split(' ')[1];

      try {
          const decodedUser = await admin.auth().verifyIdToken(token);
          req.decodedEmail = decodedUser.email;
      }
      catch {

      }

  }
  next();
}


app.get("/", (req, res) => {
  res.send("hello world");
});
app.use(cors());
app.use(bodyParser.json());
// app.use(express.static("doctors"));
// app.use(fileUpload());

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
async function run() {
  try{
   await client.connect((err) => {
    console.log("database connected");
      const bookingsCollection = client.db("HotelDb").collection("bookings");
      const roomCollection = client.db("HotelDb").collection("rooms");
      const userCollection = client.db("HotelDb").collection("users");
     
     
    //  ..... POST ....
  
    app.post('/addRooms',(req,res)=>{
      const room=req.body;
      console.log(room);
      roomCollection.insertMany(room)
      .then(result=>{
          console.log(result.insertedCount);
          res.send(result.insertedCount);
      })
  })
  
    app.post("/addBookings", (req, res) => {
      const booking = req.body;
      console.log(booking);
      bookingsCollection.insertOne(booking).then((result) => {
        res.send(result.insertCount > 0);
      });
      });
     
     
    

    //.. users ...
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      console.log(result);
      res.json(result);
  });
      // .. update status ...
      app.patch('/updateStatus/:id', (req, res) => {
      const id = ObjectID(req.params.id)
      console.log( req.body.status);
      bookingsCollection.updateOne({ _id: id }, {
      $set: { status: req.body.status, color: req.body.color }
     })
      .then(result => {
        console.log(result);
        }) ;
      });

      //... put users ...

      app.put('/users', async (req, res) => {
        const user = req.body;
        const filter = { email: user.email };
        const options = { upsert: true };
        const updateDoc = { $set: user };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        res.json(result);
    });

    app.put('/users/admin', verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
     
      if (requester) {
          const requesterAccount = await userCollection.findOne({ email: requester });
          if (requesterAccount.role === 'admin') {
              const filter = { email: user.email };
              const updateDoc = { $set: { role: 'admin' } };
              const result = await userCollection.updateOne(filter, updateDoc);
              res.json(result);
          }
      }
      else {
          res.status(403).json({ message: 'you do not have access to make admin' })
      }

  })
  

   //api for deleting user by admin
   app.delete('/deleteUser/:id', (req, res) => {
    const id = ObjectID(req.params.id);
    console.log("did=",id);
    bookingsCollection.findOneAndDelete({ _id: id })
        .then(res => console.log("successfully deleted"))
       
  })
      //get the information from database

      // .. get users ...
      app.get('/users/:email', async (req, res) => {
        const email = req.params.email;
        const query = { email: email };
        const user = await userCollection.findOne(query);
        let isAdmin = false;
        if (user?.role === 'admin') {
            isAdmin = true;
        }
        res.json({ admin: isAdmin });
    })
  //get all info. of rooms 
    app.get("/rooms", (req, res) => {
     
    roomCollection.find({}).toArray((err, documents) => {
      
       res.send(documents);
        });
    });
  //get singleS info. of rooms  
    app.get('/rooms/:id',(req,res)=>{
      roomCollection.find({id:req.params.id})
      .toArray((err,documents)=>{
          res.send(documents[0]);
      })
  })
    app.get("/bookings", (req, res) => {
      bookingsCollection.find({}).toArray((err, documents) => {
        res.send(documents);
      });
  
    });
  
     //api to find order for specific user
     app.get('/userOrder/:email',(req,res)=>{
       const email=req.params.email;
       console.log(email);
       bookingsCollection.find({email:email})
       .toArray((err,documents)=>{
         res.send(documents);
       })
     })
  
    });
  }
finally {
  // await client.close();
}}
run().catch(console.dir);

  
app.listen(port, () => {
  console.log(`listening at ${port}`)
})
