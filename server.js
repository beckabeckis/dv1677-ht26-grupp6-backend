// server.js — starta servern
import app from './app.js'
import { connectToDatabase } from './db/database.mjs'
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const PORT = process.env.PORT || 3000

// Skapa HTTP-servern för Express
const httpServer = createServer(app)

// Koppla Socket.io till samma HTTP-server
const io = new Server(httpServer, {
    cors: { origin: '*' }
})

// Gör Socket.io tillgängligt för Express
app.set('io', io)

// Hantera WebSocket-anslutningar
io.on('connection', (socket) => {
    console.log('Användare ansluten:', socket.id)

    // Användaren ansluter till ett rum
    socket.on('join', (room) => {
        socket.join(room)
    })

    // Användaren kopplar från
    socket.on('disconnect', () => {
        console.log('Användare frånkopplad:', socket.id)
    })
})

// Starta servern när databasen är ansluten
connectToDatabase().then(() => {
    httpServer.listen(PORT, () => {
        console.log(`API listening on port ${PORT}`)
    })
})