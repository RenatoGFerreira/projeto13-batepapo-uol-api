import express from "express"
import cors from "cors"

const server = express()

const PORT = 5000


server.listen(PORT, () => `Server running in port ${PORT}`)


