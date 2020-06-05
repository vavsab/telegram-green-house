export class DbConfigManager {
    private store = {};

    public get<T>(classRef: new() => T): T {
        const defaultValue = new classRef();
        const key = (defaultValue as any).configKey;
        if (!key) {
            throw 'Decorate config class with @Config';
        }

        const storeValue = this.store[key];
        if (storeValue) {
            return storeValue;
        }

        return defaultValue;
    }

    public set<T>(classRef: new() => T, value: Partial<T>) {
        const defaultValue = new classRef();
        const key = (defaultValue as any).configKey;
        if (!key) {
            throw 'Decorate config class with @Config';
        }

        const currentConfig = this.get(classRef);

        this.store[key] = Object.assign(currentConfig, value);
    }
}

@Config('windows')
export class WindowsConfig {
    automateOpenClose: boolean = false;

    openTemperature: number = 15;

    closeTemperature: number = 30;
}

function Config(key: string) {
    return (constructor: Function) => {
        constructor.prototype.configKey = key;
    }
}