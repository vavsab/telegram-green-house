import { WindowsManager } from "./windows-manager";
import { SensorsSource } from "../../sensor/sensors-source";
import { DbConfigManager, WindowsConfig } from "../db-config/db-config-manager";
import { EventEmitter } from "typed-event-emitter";

type WindowsAutomationState = 'Open' | 'Closed' | undefined;

export class WindowsAutomationAction {
    public address: number;

    public action: 'close' | 'open';
}

export class WindowsAutomation extends EventEmitter {
    private isEnabled = false;
    private lastState: WindowsAutomationState;
    private latestConfig: WindowsConfig | undefined;

    public onWindowsAction = this.registerEvent<(action: WindowsAutomationAction) => void>();

    constructor(private sensorsSource: SensorsSource,
        private windowsManager: WindowsManager,
        private configManager: DbConfigManager) {
            super();
        }

    public async start(): Promise<void> {
        if (this.isEnabled) {
            throw 'Cannot start windows automation twice';
        }

        this.latestConfig = await this.configManager.get(WindowsConfig);

        this.configManager.onConfigChanged(x => {
            if (!x.isOfType(WindowsConfig)) {
                return;
            }

            this.latestConfig  = x.newConfig;
        });

        this.sensorsSource.onDataReceived(async data => {
            const addresses = this.windowsManager.addresses;
            
            if (addresses.length > 0 && this.latestConfig.automateOpenClose) {
                let desiredState: WindowsAutomationState = undefined;

                if (data.temperature >= this.latestConfig.openTemperature) {
                    desiredState = 'Open';
                }
                else if (data.temperature <= this.latestConfig.closeTemperature) {
                    desiredState = 'Closed';
                }

                if (desiredState == undefined) {
                    return;
                }

                if (this.lastState != desiredState) {
                    let command = 'close';
                    if (desiredState == 'Open') {
                        command = 'open';
                    }

                    const lastAddress = addresses[addresses.length - 1];
                    await this.windowsManager.sendCommand(lastAddress, command);
                    
                    console.log(`WindowsAutomation > Started to ${command} window #${lastAddress}`);

                    this.emit(this.onWindowsAction, { address: lastAddress, action: command });

                    this.lastState = desiredState;
                }
            }
        });

        this.isEnabled = true;
    }
}