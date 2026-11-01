import express from 'express';
import { broker, BrokerError} from "../config/broker.js"

const brokerRouter = express.Router();


// ========================================
// BROKER
// ========================================

// GET broker connection information
brokerRouter.get('/broker/whoami', async (req, res) => {
    try {
        await broker.call('/whoami')
    } catch (err) {
        if (!(err instanceof BrokerError)) throw err
        return res.status(503).json({ error: 'Error', code: err.code })
    }

    return response.json();
});


// GET broker inventory
brokerRouter.get('/broker/inventory/:provider', async (req, res) => {
    const provider = req.params.provider

    if (provider !== "proxmox" || provider !== "maas" || provider !== "openstack") {
        throw new Error('Not an existing provider!');
    }

    try {
        await broker.inventory(provider)
    } catch (err) {
        if (!(err instanceof BrokerError)) throw err
        return res.status(503).json({ error: 'Error', code: err.code })
    }
    
});


export default brokerRouter;
