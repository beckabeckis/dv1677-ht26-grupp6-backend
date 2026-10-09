
const BROKER_API_URL = process.env.BROKER_API_URL;
const BROKER_GROUP_TOKEN = process.env.BROKER_GROUP_TOKEN;

export async function getBrokerInfo() {
    if (!BROKER_API_URL || !BROKER_GROUP_TOKEN) {
        throw new Error('Broker-inställningar saknas');
    }

    const response = await fetch(`${BROKER_API_URL}/whoami`, {
        headers: {
            'X-Booker-Group': BROKER_GROUP_TOKEN
        }
    });

    if (!response.ok) {
        throw new Error(`Broker svarade med HTTP ${response.status}`);
    }

    return response.json();
}
