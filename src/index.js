import express from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import joi from "joi"
import dayjs from "dayjs"
import dotenv from "dotenv"
dotenv.config()


const PORT = 5000
const app = express()
app.use(cors())
app.use(express.json())



const participantsSchema = joi.object(
    {
        name: joi.string().required().min(3)
    }
)

const mongoClient = new MongoClient(process.env.DATABASE_URL)
try{
    await mongoClient.connect()
    console.log("MongoDB is running")

}catch(err){
    console.log(err.message)
}

const db = mongoClient.db("batePapoUol")

app.post("/participants", async (req, res) =>{
    const {name} = req.body

    const {error} = participantsSchema.validate({name}, {abortEarly: false})

    if(error){
        const erros = error.details.map(detail => detail.message)
        return res.status(422).send(erros)
    }

    try{
        const participantExists = await db.collection("participants").findOne({name})
        if(participantExists){
            return res.sendStatus(409)
        }

        await db.collection("participants").insertOne({
            name: name, 
            lastStatus: Date.now()
        })
        await db.collection("messages").insertOne({
            from: name,
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            time: dayjs().format("HH:mm:ss")
        })
        res.sendStatus(201)

    }catch(err){
        console.log(err)
        res.sendStatus(500)
    }
})


app.get("/participants", async (req, res) =>{

    try{
        const participants = await db.collection("participants").find().toArray()
        return res.send(participants)

    }catch(err){
        console.log(err)
        return sendStatus(500)
    }
})

app.post("/messages", (req, res) =>{
    res.sendStatus(201)
})

app.get("/messages", (req, res) =>{
    res.send("ok")
})

app.post("/status", (req, res) =>{
    res.sendStatus(200)
})


app.listen(PORT, ()=>{
    console.log(`Server running in port ${PORT}`)
})