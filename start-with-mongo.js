/**
 * MongoDB Memory Server wrapper
 * Roda MongoDB em memória sem precisar de instalação local
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

async function startMongo() {
    const mongod = await MongoMemoryServer.create({
        instance: { dbName: 'streetsoccer' },
    });
    const uri = mongod.getUri();
    console.log('[MongoDB Memory] URI:', uri);
    process.env.DBPASS = uri;
    process.env.DBROUTE = '/users';
    return uri;
}

startMongo().then(() => {
    require('./server/server.js');
}).catch(err => {
    console.error('Erro ao iniciar MongoDB:', err);
    process.exit(1);
});
