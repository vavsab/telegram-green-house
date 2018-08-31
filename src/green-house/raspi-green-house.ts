import { IGreenHouse, SensorsData, WindowCommand } from "./green-house";
import { exec } from 'child_process';
import { AppConfiguration } from "../app-configuration";
import * as EventEmitter from "events";

export class RaspiGreenHouse implements IGreenHouse {
    public readonly isEmulator: boolean;
    public readonly eventEmitter : EventEmitter;
    private readonly sensor: any;
    private readonly rpio: any;

    private readonly max485Pin: number = 12; // GPIO18
    private readonly max485Transmit: number;
    private readonly max485Receive: number;

    private readonly waterPin: number = 38; // GPIO20
    private readonly lightsPin: number = 40; // GPIO21
    private readonly relayOff: number;
    private readonly relayOn: number;

    private readonly config: AppConfiguration;
    private serial;

    constructor(config: AppConfiguration) {
        this.eventEmitter = new EventEmitter();
        this.config = config;
        this.isEmulator = false;
        const htu21d = require('./htu21d-i2c');
        this.sensor = new htu21d();

        const rpio = require('rpio');
        this.rpio = rpio;

        this.max485Transmit = rpio.HIGH;
        this.max485Receive =  rpio.LOW;

        this.relayOff = rpio.HIGH;
        this.relayOn = rpio.LOW;

        rpio.open(this.waterPin, rpio.OUTPUT, this.relayOff);
        rpio.open(this.lightsPin, rpio.OUTPUT, this.relayOff);
        rpio.open(this.max485Pin, rpio.OUTPUT, this.max485Receive);

        const raspi = require('raspi').init;
        const Serial = require('raspi-serial').Serial;

        raspi(() => {
            this.serial = new Serial({portId: '/dev/serial0'});
            this.serial.open(() => {
                let buffer = '';
                
                this.serial.on('data', (data) => {
                    buffer += data.toString();
                    if (buffer.indexOf('\n') != -1){
                        this.eventEmitter.emit('serial-data', buffer);
                        console.log('Serial >' + buffer);
                        buffer = '';
                    }
                });
        
            });
        });
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

    public sendWindowCommand(command: WindowCommand): void {
        this.rpio.write(this.max485Pin, this.max485Transmit);
        setTimeout(() => {
            this.serial.write(command.toSerialCommand(), () => {
                setTimeout(() => {
                    this.rpio.write(this.max485Pin, this.max485Receive);
                }, 10);
            });
        }, 10);
    }
}