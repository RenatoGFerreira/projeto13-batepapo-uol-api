import express from "express"
import cors from "cors"

const PORT = 5000
const app = express()
app.use(cors())
app.use(express.json())



app.post("/participants", (req, res) =>{
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