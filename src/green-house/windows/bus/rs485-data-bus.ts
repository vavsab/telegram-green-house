import { DataBus } from "./data-bus";

export class RS485DataBus extends DataBus {
    private readonly max485Pin: number = 12; // GPIO18
    private readonly max485Transmit: number;
    private readonly max485Receive: number;
    private readonly rpio: any;
    private serial;
    private buffer: string = '';
    private readonly maxBufferSize = 1000;
    private readonly responseTimeoutInMs = 150;
    private readonly pinSwitchTimeoutInMs = 10;

    constructor() {
        super();

        const rpio = require('rpio');
        this.rpio = rpio;

        this.max485Transmit = rpio.HIGH;
        this.max485Receive =  rpio.LOW;

        rpio.open(this.max485Pin, rpio.OUTPUT, this.max485Transmit);

        const raspi = require('raspi').init;
        const Serial = require('raspi-serial').Serial;

        raspi(() => {
            this.serial = new Serial({portId: '/dev/serial0'});
            this.serial.open(() => {
                
                this.serial.on('data', (data) => {
                    this.buffer += (<String>data.toString()).replace('\r', '').replace('\n', '');

                    if (this.buffer.length > this.maxBufferSize) {
                        this.buffer = '';
                        console.log(`rs485-data-bus > Cleared buffer because its size became more than ${this.maxBufferSize}`);
                    }
                });
        
            });
        });
    }

    protected async processCommand(command: string): Promise<string> {
        return new Promise<string> (resolve => {
            this.buffer = '';
            setTimeout(() => {
                this.serial.write(`${command}\n`, () => {
                    setTimeout(() => {
                        this.rpio.write(this.max485Pin, this.max485Receive);
                        setTimeout(() => {
                            this.rpio.write(this.max485Pin, this.max485Transmit);
                            console.log(`rs485-data-bus > Response for command '${command}': '${this.buffer}'`);
                            resolve(this.buffer);
                            this.buffer = '';
                        }, this.responseTimeoutInMs);
                    }, this.pinSwitchTimeoutInMs);
                });
            }, this.pinSwitchTimeoutInMs);
        });
    }
}