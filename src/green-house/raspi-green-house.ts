import { IGreenHouse, SensorsData } from "./green-house";
import { exec } from 'child_process';
import { AppConfiguration } from "../app-configuration";
import { WindowsManager } from "./windows/windows-manager";
import { RS485DataBus } from "./windows/bus/rs485-data-bus";

export class RaspiGreenHouse implements IGreenHouse {
    public readonly isEmulator: boolean;
    private readonly sensor: any;
    private readonly rpio: any;
    private readonly windowsManager: WindowsManager;
    private readonly waterPin: number = 38; // GPIO20
    private readonly lightsPin: number = 40; // GPIO21
    private readonly relayOff: number;
    private readonly relayOn: number;
    private readonly config: AppConfiguration;

    constructor(config: AppConfiguration) {
        this.config = config;
        this.isEmulator = false;
        const htu21d = require('./htu21d-i2c');
        this.sensor = new htu21d();

        const rpio = require('rpio');
        this.rpio = rpio;

        this.windowsManager = new WindowsManager(config.bot.windowAddresses, new RS485DataBus());

        this.relayOff = rpio.HIGH;
        this.relayOn = rpio.LOW;

        rpio.open(this.waterPin, rpio.OUTPUT, this.relayOff);
        rpio.open(this.lightsPin, rpio.OUTPUT, this.relayOff);
    }

    public getSensorsData(): Promise<SensorsData> {
        return new Promise<SensorsData>(resolve => {
            this.sensor.readTemperature(temperature => {
                this.sensor.readHumidity(humidity => {
                    resolve({ temperature: parseFloat(temperature), humidity: parseFloat(humidity) });
                });
            });
        });
    }

    public setWaterValve(isOpen: boolean): void {
        this.rpio.write(this.waterPin, isOpen ? this.relayOn : this.relayOff);
    }

    public setLights(isSwitchedOn: boolean): void {
        this.rpio.write(this.lightsPin, isSwitchedOn ? this.relayOn : this.relayOff);
    }

    public async takePhoto(): Promise<string> {
        const photoFileName = 'web-cam-shot.jpg';

        await new Promise((resolve, reject) => {
            exec(`fswebcam --jpeg 90 -r 1280x720 -D ${this.config.bot.takePhotoDelayInSeconds} ${photoFileName}`, 
                (error, stdout, stderr) => {
                    if (error) {
                        reject(`${error}, stdout: ${stderr}, stdout: ${stdout}`);
                    } else {
                        resolve();
                    }
                });
        });

        return photoFileName;
    }

    public async recordVideo(seconds: number): Promise<string> {
        const fileName = 'web-cam-video.mp4'
        
        await new Promise((resolve, reject) => {
            exec(`ffmpeg -t ${seconds} -f v4l2 -s 1280x720 -framerate 25 -i /dev/video0 ${fileName} -y`, (error, stdout, stderr) => {
                if (error) {
                    reject(`${error}, stdout: ${stderr}, stdout: ${stdout}`);
                } else {
                    resolve();
                }
            })
        });

        return fileName;
    }

    public getWindowsManager(): WindowsManager {
        return this.windowsManager;
    }
}