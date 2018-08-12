import { IGreenHouse, SensorsData, WindowCommand } from "./green-house";
import * as events from "events";
import { AppConfiguration } from "../app-configuration";
import * as resources from "../resources";

export class EmulatorGreenHouse implements IGreenHouse {
    public readonly isEmulator: boolean;
    public readonly eventEmitter: events;
    public readonly config: AppConfiguration;
    public sensorsData : SensorsData;
    public isLightsOn: boolean;
    public isWaterOn: boolean;

    constructor(config: AppConfiguration) {
        this.isEmulator = true;
        this.sensorsData = { temperature: 23, humidity: 50 };
        this.isWaterOn = false;
        this.isLightsOn = false;
        this.eventEmitter = new events();
        this.config = config;
    }

    public getSensorsData(): Promise<SensorsData> {
        return new Promise<SensorsData>(resolve => {
            resolve(this.sensorsData);
        });
    }

    public setWaterValve(isOpen: boolean): void {
        this.isWaterOn = isOpen;
        this.eventEmitter.emit('water-changed', isOpen);
    }

    public setLights(isSwitchedOn: boolean): void {
        this.isLightsOn = isSwitchedOn;
        this.eventEmitter.emit('lights-changed', isSwitchedOn);
    }

    public takePhoto(): Promise<string> {
        return new Promise<string>(resolve => {
            setTimeout(() => resolve(resources.getFilePath('emulator', 'photo-sample.jpg')), this.config.bot.takePhotoDelayInSeconds * 1000);
        });
    }

    public recordVideo(seconds: number): Promise<string> {
        if (seconds != 5)
            throw new Error("Only 5 seconds video is supported in demo mode");
        
        return new Promise<string>(resolve => {
            setTimeout(() => resolve(resources.getFilePath('emulator', 'video-sample-5sec.mp4')), seconds);
        })
    }

    public sendWindowCommand(command: WindowCommand): void {
        console.log(`Emulator > Sent serial command: ${command.toSerialCommand()}`)
    }
}