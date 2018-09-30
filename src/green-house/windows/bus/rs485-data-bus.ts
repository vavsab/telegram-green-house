import { DataBus } from "./data-bus";

export class RS485DataBus extends DataBus {
    private readonly max485Pin: number = 12; // GPIO18
    private readonly max485Transmit: number;
    private readonly max485Receive: number;
    private readonly rpio: any;
    private serial;
    private buffer: string = '';

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
                    this.buffer += data.toString();
                    if (this.buffer.indexOf('\n') != -1){
                        console.log('Serial >' + this.buffer);
                    }
                });
        
            });
        });
    }

    protected async processCommand(command: string): Promise<string> {
        return new Promise<string> (resolve => {
            this.buffer = '';
            setTimeout(() => {
                this.serial.write(command, () => {
                    setTimeout(() => {
                        this.rpio.write(this.max485Pin, this.max485Receive);
                        setTimeout(() => {
                            this.rpio.write(this.max485Pin, this.max485Transmit);
                            resolve(this.buffer);
                            this.buffer = '';
                        }, 200);
                    }, 10);
                });
            }, 10);
        });
    }
}