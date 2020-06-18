import { databaseController } from "../../databaseController";
import { EventEmitter } from "typed-event-emitter";

export class ChangedConfig {
    public key: string;

    public newConfig: any;

    public userInfo: string;
}

export class DbConfigManager extends EventEmitter {

    onConfigChanged = this.registerEvent<(changedConfig: ChangedConfig) => void>();

    public get<T>(classRef: new() => T): T {
        const defaultValue = new classRef();
        const key = (defaultValue as any).configKey;
        if (!key) {
            throw 'Decorate config class with @Config';
        }

        const dbValue = this.readConfigFromDb(key);

        if (dbValue) {
            // If new values appear in config, they will be set up to defaults on the fly.
            return Object.assign(new classRef(), dbValue);
        }

        return defaultValue;
    }

    public set<T>(classRef: new() => T, value: Partial<T>, userInfo: string) {
        const defaultValue = new classRef();
        const key = (defaultValue as any).configKey;
        if (!key) {
            throw 'Decorate config class with @Config';
        }

        const currentConfig = this.get(classRef);
        const newConfig = Object.assign(currentConfig, value);

        this.saveConfigToDb(key, newConfig);
        this.emit(this.onConfigChanged, { key, newConfig, userInfo })
    }

    private async readConfigFromDb(key: string): Promise<string | null> {
        return await databaseController.run<string | null>(async db => {
            return await db.collection('settings').findOne({ key: key });
        });
    }

    private async saveConfigToDb(key: string, value: any): Promise<void> {
        await databaseController.run(async db => {
            await db.collection('settings').insertOne(value);
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