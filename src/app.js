import express from "express"
import cors from "cors"
import joi from "joi"
import { MongoClient } from "mongodb"
import dotenv from "dotenv"
dotenv.config()
import dayjs from "dayjs"

const server = express()
const PORT = 5000
const mongoClient = new MongoClient(process.env.DATABASE_URL)

server.use(cors())
server.use(express.json())

try {
    await mongoClient.connect()
    console.log('Conectado com MongoDB')
} catch (err) {
    console.log(`Erro inesperado: (${err}).`)
}


const db = mongoClient.db();


const participantsValidating = joi.object({
    name: joi.string().required()
})

const messageValidating = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().required().valid("message", "private_message"),
    from: joi.string().required(),
    time: joi.string(),
});

server.post("/participants", async (req, res) => {
    const { name } = req.body
    const { error } = participantsValidating.validate({ name })
    if (error) {
        return res.status(422).send(error)
    }

    try {
        const participantsConnected = await db.collection("participants").findOne({ name: name })
        if (participantsConnected) {
            res.sendStatus(500)
            return
        }


        await db.collection("participants").insertOne({ name: name, lastStatus: Date.now() })
        await db.collection("messages").insertOne({
            to: "Todos",
            text: "entra na sala...",
            type: "status",
            from: name,
            time: dayjs().format("HH:MM:SS"),
        })
        res.sendStatus(201)

    } catch (err) {
        console.log(err)
        res.sendStatus(409)
    }
})

server.get("/participants", async (req, res) => {
    try {
        const participantList = await db.collection("participants").find().toArray()
        res.send(participantList)
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
})

server.post("/messages", async (req, res) => {
    const { to, text, type } = req.body
    const { user } = req.headers

    try {
        const objMessage = {
            from: user,
            to: to,
            text: text,
            type: type,
            time: dayjs().format("HH:MM:SS")
        }

        const validation = messageValidating.validate(objMessage)
        if (validation.error) {
            res.status(422).send(error)
            return
        }

        await db.collection("messages").insertOne(objMessage)
        res.sendStatus(201)

    } catch (err) {
        console.log(err)
        res.sendStatus(422)
    }
})

server.get("/messages", async (req, res) => {
    const { user } = req.headers
    const limit = Number(req.query.limit)
    try {
        const messagesList = await db.collection("messages")
            .find({
                $or: [
                    { from: user },
                    { to: { $in: [user, "Todos"] } },
                    { type: "message" },
                ],
            })
            .limit(limit)
            .toArray()
        res.send(messagesList)

    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
})

server.post("/status", async (req, res) => {
    const { user } = req.headers

    try {
        const inList = await db.collection("messages").findOne({ name: user, })
        if (!inList){
            return res.send(404)
        }

        await db.collection("messages").updateOne(
            { name: user },
            { $set: { lastStatus: Date.now() } }
        )
        res.sendStatus(200)
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }
})

setInterval(async () => {
    const timeKick = Number(Date.now()) - 10000
    try {
        const inactivies = await db.collection("participants").find({ lastStatus: { $lte: timeKick } }).toArray()

        if (inactivies.length > 0) {
            const inactiviesMessages = inactivies.map(p => {
                return {
                    from: p.name,
                    to: "Todos",
                    text: "sai da sala...",
                    type: "status",
                    time: dayjs().format("HH:MM:SS"),
                }
            })
            await db.collection("messages").insertMany(inactiviesMessages)
            await db.collection("participants").deleteMany({ lastStatus: { $lte: timeKick } })
        }
    } catch (err) {
        console.log(err)
        res.sendStatus(500)
    }

}, 15000) //15 segundos


server.listen(PORT, () => `Server running in port ${PORT}`)


