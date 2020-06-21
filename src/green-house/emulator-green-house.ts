import { IGreenHouse, SensorsData } from "./green-house";
import * as events from "events";
import { AppConfiguration } from "../app-configuration";
import * as resources from "../resources";
import { WindowsManager } from "./windows/windows-manager";
import { EmulatorDataBus } from "./windows/bus/emulator-data-bus";
import { DbConfigManager, PhotoConfig } from "./db-config/db-config-manager";

export class EmulatorGreenHouse implements IGreenHouse {
    public readonly isEmulator: boolean;
    public readonly eventEmitter: events;
    private readonly windowsManager: WindowsManager;
    public sensorsData : SensorsData;
    public isLightsOn: boolean;
    public isWaterOn: boolean;

    constructor(private config: AppConfiguration, private dbConfig: DbConfigManager) {
        this.isEmulator = true;
        this.sensorsData = { temperature: 23, humidity: 50 };
        this.isWaterOn = false;
        this.isLightsOn = false;
        this.eventEmitter = new events();

        this.windowsManager = new WindowsManager(config.bot.windowAddresses, new EmulatorDataBus());
    }

    public getSensorsData(): Promise<SensorsData> {
        return new Promise<SensorsData>(resolve => {
            resolve(this.sensorsData);
        });
    }

    public setWaterValve(valveId: number, isOpen: boolean): void {
        // TODO: Implement multiple valves support in emulator
        this.isWaterOn = isOpen;
        this.eventEmitter.emit('water-changed', isOpen);
    }

    public setLights(isSwitchedOn: boolean): void {
        this.isLightsOn = isSwitchedOn;
        this.eventEmitter.emit('lights-changed', isSwitchedOn);
    }

    public async takePhoto(): Promise<string> {
        const photoConfig = await this.dbConfig.get(PhotoConfig);

        return new Promise<string>(resolve => {
            setTimeout(() => resolve(resources.getFilePath('emulator', 'photo-sample.jpg')), photoConfig.delayBeforeShotInSeconds * 1000);
        });
    }

    public recordVideo(seconds: number): Promise<string> {
        if (seconds != 5)
            throw new Error("Only 5 seconds video is supported in demo mode");
        
        return new Promise<string>(resolve => {
            setTimeout(() => resolve(resources.getFilePath('emulator', 'video-sample-5sec.mp4')), seconds);
        })
    }

    public getWindowsManager(): WindowsManager {
        return this.windowsManager;
    }
}