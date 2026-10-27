import { io as Client } from 'socket.io-client'
import { it, expect } from 'vitest'

it('skickar uppdatering till andra i rummet', async () => {
    const port = "3000"

    
    const a = Client(`http://localhost:${port}`, {
        reconnection: false,
        timeout: 2000,
    })
    
    const b = Client(`http://localhost:${port}`, {
        reconnection: false,
        timeout: 2000,
    })
    try {
        await new Promise(r => { a.on('connect', r) })
        await new Promise(r => { b.on('connect', r) })
        
        
        a.emit('join', 'resource:1')
        b.emit('join', 'resource:1')

    } finally {
        a.disconnect()
        b.disconnect()
    }
}, 7000)