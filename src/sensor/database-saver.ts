import { databaseController } from '../database-controller';
import { SensorsSource } from './sensors-source';
import { DbConfigManager, SensorsConfig } from '../green-house/db-config/db-config-manager';

export class SensorsDatabaseSaver {
    private isEnabled = false;
    private timerHandler: NodeJS.Timeout | undefined;
    private latestConfig: SensorsConfig | undefined;

    constructor(
        private dbConfig: DbConfigManager,
        private sensorsSource: SensorsSource) {}

    public async start(): Promise<void> {
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

        this.latestConfig = await this.dbConfig.get(SensorsConfig);

        this.dbConfig.onConfigChanged(x => {
            if (!x.isOfType(SensorsConfig)) {
                return;
            }

            this.latestConfig = x.newConfig;
            restartTimer();
        });
    
        const restartTimer = () => {
            if (this.timerHandler) {
                clearInterval(this.timerHandler);
            }

            this.timerHandler = setInterval(saveIntoDatabase, this.latestConfig.saveIntoDbEveryXMinutes * 60 * 1000);
        }
        
        restartTimer();

        this.isEnabled = true;
    }
}