import express from "express"
import cors from "cors"
import { MongoClient } from "mongodb"
import joi from "joi"
import dotenv from "dotenv"
dotenv.config()


const PORT = 5000
const app = express()
app.use(cors())
app.use(express.json())



const mongoClient = new MongoClient(process.env.DATABASE_URL)
try{
    await mongoClient.connect()
    console.log("MongoDB is running")

}catch(err){
    console.log(err.message)
}

const d = mongoClient.db("batePapoUol")


app.post("/participants", async (req, res) =>{
    res.sendStatus(201)
})

app.get("/participants", (req, res) =>{
    res.send("ok")
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