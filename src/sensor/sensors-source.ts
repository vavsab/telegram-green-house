import { IGreenHouse, SensorsData } from "../green-house/green-house";
import { EventEmitter } from "typed-event-emitter";

export class SensorsSource extends EventEmitter {
    private isEnabled = false;

    public onDataReceived = this.registerEvent<(data: SensorsData) => void>();

    constructor(private greenHouse: IGreenHouse) {
        super();
    }

    public start() {
        if (this.isEnabled) {
            throw 'Cannot start sensors monitoring twice';
        }

        setInterval(async () => {
            let sensorData: SensorsData = await this.greenHouse.getSensorsData();
            this.emit(this.onDataReceived, sensorData);
        }, 5000);

        this.isEnabled = true;
    }
}
