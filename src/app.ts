import * as events from 'events';
import { Bot } from './bot';
import * as databaseSaver from './sensor/databaseSaver';
import * as lightSwitcher from './lightSwitcher';
import * as sensor from './sensor/sensor'
import { AppConfiguration } from './app-configuration';
import { WebEmulator } from './web-emulator';
import { IGreenHouse } from './green-house/green-house';
import { EmulatorGreenHouse } from './green-house/emulator-green-house';
import { RaspiGreenHouse } from './green-house/raspi-green-house';
import { WebPanel } from './web-panel';

let eventEmitter = new events();

let config: AppConfiguration = require('./config.json');

let greenHouse: IGreenHouse;
if (config.webEmulator.isEnabled) {
    greenHouse = new EmulatorGreenHouse(config);
} else {
    greenHouse = new RaspiGreenHouse(config);
}

sensor.start(eventEmitter, greenHouse);
new Bot().start(eventEmitter, config, greenHouse);
databaseSaver.start(eventEmitter, config);
lightSwitcher.start(config, greenHouse);

if (config.webPanel.isEnabled) {   
    new WebPanel().start(config, eventEmitter);
}

if (config.webEmulator.isEnabled) {
    new WebEmulator().start(config, greenHouse);
}