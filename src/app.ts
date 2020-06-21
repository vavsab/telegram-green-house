import { Bot } from './bot';
import { AppConfiguration } from './app-configuration';
import { WebEmulator } from './web-emulator';
import { IGreenHouse } from './green-house/green-house';
import { EmulatorGreenHouse } from './green-house/emulator-green-house';
import { RaspiGreenHouse } from './green-house/raspi-green-house';
import { WebPanel } from './web-panel';
import { gettextController } from './gettext';
import * as utils from './utils';
import { SensorsSource } from './sensor/sensors-source';
import { SensorsDatabaseSaver } from './sensor/database-saver';
import { DownDetector } from './down-detector';
import { LightSwitcher } from './light-switcher';
import { WindowsAutomation } from './green-house/windows/windows-automation';
import { DbConfigManager } from './green-house/db-config/db-config-manager';

utils.init();

const config: AppConfiguration = require('./config.json');
const dbConfig = new DbConfigManager();

gettextController.setLocale(config.language);

let greenHouse: IGreenHouse;
if (config.webEmulator.isEnabled) {
    greenHouse = new EmulatorGreenHouse(config);
} else {
    greenHouse = new RaspiGreenHouse(config);
}

const sensorsSource = new SensorsSource(greenHouse);
const sensorsDatabaseSaver = new SensorsDatabaseSaver(config, sensorsSource);
const windowsAutomation = new WindowsAutomation(sensorsSource, greenHouse.getWindowsManager(), dbConfig);

new Bot().start(sensorsSource, config, greenHouse, dbConfig, windowsAutomation);

if (config.webPanel.isEnabled) {   
    new WebPanel().start(config, sensorsSource);
}

if (config.webEmulator.isEnabled) {
    new WebEmulator().start(config, greenHouse);
}

sensorsSource.start();
sensorsDatabaseSaver.start();
windowsAutomation.start();

new DownDetector(config.downDetector).start();
new LightSwitcher(config, greenHouse).start();