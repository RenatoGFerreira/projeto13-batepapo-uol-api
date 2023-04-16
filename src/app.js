import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import joi from "joi";
import dayjs from "dayjs";
import dotenv from "dotenv";
dotenv.config();

const PORT = 5000;
const app = express();
app.use(cors());
app.use(express.json());

const participantsSchema = joi.object({
  name: joi.string().required().min(3),
});

const messageSchema = joi.object({
  from: joi.string().required().min(3),
  to: joi.string().required().min(3),
  text: joi.string().required().min(1),
  type: joi.string().required().valid("message", "private_message"),
  time: joi.string(),
});

const mongoClient = new MongoClient(process.env.DATABASE_URL);
try {
  await mongoClient.connect();
  console.log("MongoDB is running");
} catch (err) {
  console.log(err.message);
}

const db = mongoClient.db();

app.post("/participants", async (req, res) => {
  const { name } = req.body;

  const { error } = participantsSchema.validate(
    { name },
    { abortEarly: false }
  );

  if (error) {
    const erros = error.details.map((detail) => detail.message);
    return res.status(422).send(erros);
  }

  try {
    const participantExists = await db.collection("participants").findOne({ name });
    if (participantExists) {
      return res.sendStatus(409);
    }

    await db.collection("participants").insertOne({name: name, lastStatus: Date.now()});
    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: dayjs().format("HH:mm:ss")
    });
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    return res.send(participants);
  } catch (err) {
    console.log(err);
    return sendStatus(500);
  }
});

app.post("/messages", async (req, res) => {
  const { user } = req.headers;
  const { to, text, type } = req.body;
  const sendMesage = {
    from: user,
    to: to,
    text: text,
    type: type,
    time: dayjs().format("HH:mm:ss"),
  };

  try {
    const haveUser = db.collection("participants").findOne({user})
    if(!haveUser){
      return res.status(422).send("Não foi possível enviar mensagem.")
    }
    const { error } = messageSchema.validate(sendMesage, { abortEarly: false });
    if (error) {
      const erros = error.details.map((detail) => detail.message);
      return res.status(422).send(erros);
    }

    await db.collection("messages").insertOne(sendMesage);
    console.log(sendMesage)
    res.sendStatus(201);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.get("/messages", async (req, res) => {
  const limit = Number(req.query.limit)
  const { user } = req.headers;
  console.log(limit)
  console.log(req.query.limit)

  try {
    if(limit < 1 || isNaN(limit)){
      console.log("Não numero")
      return res.sendStatus(401)
    }
    const messages = await db.collection("messages")
      .find({
        $or: [
          { from: user },
          { to: { $in: [user, "Todos"] } },
          { type: "message" },
        ],
      })
      .limit(limit)
      .toArray();

      if(messages.length === 0 ){
        return res.status(404).send("Não foi encontrado nenhuma mensagem")
      }
    res.send(messages);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
});

app.post("/status",  async (req, res) => {
    const {user} = req.headers

    try{
        const participantExists = await db.collection("participants").findOne({name: user})
        if(!participantExists){
            return res.sendStatus(404)
        }

        await db.collection("participants").updateOne({name: user}, {$set: {lastStatus: Date.now()}})
        res.sendStatus(200)

    }catch(err){
        console.log(err)
        res.sendStatus(500)
    }
});



setInterval( async ()=>{
  const tenSeconds = Date.now()-10000
  console.log(tenSeconds)

  try{
    const inactiveUser = await db
      .collection("participants").find({lastStatus: {$lte: tenSeconds}}).toArray()  //$lte matches values that are less than or equal...

    if(inactiveUser.length>0){
      const inactiveMessage = inactiveUser.map(participant => {
        return{
          
            from: participant.name,
            to: 'Todos',
            text: 'sai da sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
          
        }
      })
      console.log(inactiveMessage)
     await db.collection("messages").insertMany(inactiveMessage)
     await db.collection("participants").deleteMany({lastStatus: {$lte: tenSeconds}})
    }

  }catch(err){
    console.log(err)
    res.sendStatus(500)
  }
  
  console.log("Kick inactive users.")
}, 15000)



app.listen(PORT, () => {
  console.log(`Server running in port ${PORT}`);
});