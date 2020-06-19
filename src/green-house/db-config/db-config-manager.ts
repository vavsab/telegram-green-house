import { databaseController } from "../../databaseController";
import { EventEmitter } from "typed-event-emitter";

export class ChangedConfig {
    public key: string;

    public newConfig: any;

    public userInfo: string;
}

export class DbConfigManager extends EventEmitter {

    onConfigChanged = this.registerEvent<(changedConfig: ChangedConfig) => void>();

    public async get<T>(classRef: new() => T): Promise<T> {
        const defaultValue = new classRef();
        const key = (defaultValue as any).configKey;
        if (!key) {
            throw 'Decorate config class with @Config';
        }

        const dbValue = await this.readConfigFromDb(key);

        if (dbValue) {
            // If new values appear in config, they will be set up to defaults on the fly.
            return Object.assign(new classRef(), dbValue);
        }

        return defaultValue;
    }

    public async set<T>(classRef: new() => T, value: Partial<T>, userInfo: string) {
        const defaultValue = new classRef();
        const key = (defaultValue as any).configKey;
        if (!key) {
            throw 'Decorate config class with @Config';
        }

        const currentConfig = this.get(classRef);
        const newConfig = new classRef();
        Object.assign(newConfig, defaultValue, currentConfig, value);

        await this.saveConfigToDb(key, newConfig);
        this.emit(this.onConfigChanged, { key, newConfig, userInfo })
    }

    private async readConfigFromDb(key: string): Promise<any | null> {
        return await databaseController.run<string | null>(async db => {
            const value = await db.collection('settings').findOne({ key: key });

            if (value) {
                delete value.key;
            }
            
            return value;
        });
    }

    private async saveConfigToDb(key: string, value: any): Promise<void> {
        const filter = { key: key };

        const existing = await databaseController.run(async db => {
            return await db.collection('settings').findOne(filter);
        });

        console.log(`Existing: ${JSON.stringify(existing)}`)

        await databaseController.run(async db => {
            const document = db.collection('settings');
            const valueToSave = { key, ...value };

            if (existing) {
                await document.updateOne(filter, { $set: valueToSave } );
            } else {
                await document.insertOne(valueToSave);
            }
        });
        
    }
}

@Config('windows')
export class WindowsConfig {
    automateOpenClose: boolean = false;

    openTemperature: number = 15;

    closeTemperature: number = 30;
}

@Config('sensors')
export class SensorsConfig {
    hotTemperatureThreshold: number = 20;

    coldTemperatureThreshold: number = 10;

    temperatureThresholdViolationNotificationIntervalMinutes: number = 30;
}

function Config(key: string) {
    return (constructor: Function) => {
        constructor.prototype.configKey = key;
    }
}