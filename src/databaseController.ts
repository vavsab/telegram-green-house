const mongoClient = require('mongodb').MongoClient;

class DatabaseController {
    private database = null;

    run(callback: any) {
        return mongoClient.connect('mongodb://localhost:27017/green-house')
        .then(db => {
            this.database = db;
            return db;
        })
        .then(() => callback(this.database))
        .then((result) => this.database.close().then(() => result));
    }
}

const databaseController = new DatabaseController();

export { databaseController };