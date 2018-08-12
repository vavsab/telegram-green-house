import { databaseController } from '../databaseController';
import { AppConfiguration } from '../app-configuration';

let start = (eventEmitter, config: AppConfiguration) => {
    
    let latestResult = null;

    eventEmitter.on('sensorData', data => {
        latestResult = data;
    });

    let saveIntoDatabase = () => {
        if (latestResult == null)
            return;

        databaseController.run(db => {
            return db.collection('data').insertOne({
                date: new Date(), 
                humidity: latestResult.humidity, 
                temperature: latestResult.temperature
            });
        }).then(() => latestResult = null);
    }

    setInterval(saveIntoDatabase, config.bot.saveToDbTimeoutInMinutes * 60 * 1000);
}

export { start };