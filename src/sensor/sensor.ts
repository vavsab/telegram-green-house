import { IGreenHouse, SensorsData } from "../green-house/green-house";

let start = (eventEmitter, greenHouse: IGreenHouse) => {
    setInterval(async() => {
        let sensorData: SensorsData = await greenHouse.getSensorsData();
        eventEmitter.emit('sensorData', sensorData);
    }, 5000);
}

export { start };
