import { MongoClient, Db } from 'mongodb';

class DatabaseController {

    async run<TResult>(callback: (client: Db) => Promise<TResult>): Promise<TResult> {
        const client = await MongoClient.connect('mongodb://localhost:27017');
        const db = client.db('green-house');
        const result = await callback(db);
        await client.close();

        return result;
    }
}

const databaseController = new DatabaseController();

export { databaseController };