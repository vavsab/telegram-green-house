import { databaseController } from '../database-controller';
import { AppConfiguration } from '../app-configuration';
import { SensorsSource } from './sensors-source';

export class SensorsDatabaseSaver {
    private isEnabled = false;

    constructor(
        private config: AppConfiguration,
        private sensorsSource: SensorsSource) {}

    public start() {
        if (this.isEnabled) {
            throw 'Cannot start sensors db saver twice';
        }

        let latestResult = null;
    
        this.sensorsSource.onDataReceived(data => {
            latestResult = data;
        });
    
        let saveIntoDatabase = async () => {
            if (latestResult == null)
                return;
    
            await databaseController.run(db => {
                return db.collection('data').insertOne({
                    date: new Date(), 
                    humidity: latestResult.humidity, 
                    temperature: latestResult.temperature
                })
            });

            latestResult = null;
        }
    
        setInterval(saveIntoDatabase, this.config.bot.saveToDbTimeoutInMinutes * 60 * 1000);

        this.isEnabled = true;
    }
}