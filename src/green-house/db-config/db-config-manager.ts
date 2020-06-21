import { databaseController } from "../../database-controller";
import { EventEmitter } from "typed-event-emitter";

export class ChangedConfig {
    constructor(
        public key: string,
        public newConfig: any,
        public changedPart: any,
        public userInfo: string) {}

    public isOfType<T>(classRef: new() => T): boolean {
        const configKey = (<any>this.newConfig).configKey;
        if (!configKey) {
            return false;
        }

        return (<any>new classRef()).configKey == configKey;
    }
}

export class DbConfigManager extends EventEmitter {

    public onConfigChanged = this.registerEvent<(changedConfig: ChangedConfig) => void>();

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

        const newConfig = await this.get(classRef);
        Object.assign(newConfig, value);

        await this.saveConfigToDb(key, newConfig);
        this.emit(this.onConfigChanged, new ChangedConfig(key, newConfig, value, userInfo));
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

    openTemperature: number = 30;

    closeTemperature: number = 15;
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