// server.js — starta servern
import app from './app.js'
import { connectToDatabase } from './db/database.mjs'

const PORT = process.env.PORT || 3000

connectToDatabase().then(() => {
    app.listen(PORT, () => console.log(`API listening on port ${PORT}`))
})