import { Markup } from 'telegraf';
import { IBotModule, InitializeContext } from './bot-module'
import { WindowsManager } from '../green-house/windows/windows-manager';
import { SendCommmandResponse } from '../green-house/windows/send-command-response';
import { WindowState } from '../green-house/windows/window-state';
import { gettext } from '../gettext';

export class Windows implements IBotModule {
    private readonly _buttonsPerLine: number = 3;
    private readonly _delayBetweenGlobalWindowCommandsInMs = 7000;
    private _windowsManager: WindowsManager;

    public initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'windows', button: `♻️ ${gettext('Windows')}`, regex: new RegExp(gettext('Windows')), row: 2, isEnabled: true, order: 0 });
    }    
    
    public initialize(context: InitializeContext): void {
        this._windowsManager = context.greenHouse.getWindowsManager();

        context.configureAnswerFor('windows', ctx => this.replyWithStatus(ctx.reply, this._windowsManager.addresses));

        context.configureAction(/window\:refresh(\:(\w+))?/, async ctx => {
            let windowAddress: number =  parseInt(ctx.match[2]);

            let addresses: number[] = isNaN(windowAddress) 
                ? this._windowsManager.addresses 
                : [windowAddress];

            await ctx.editMessageText(`⏳ ${gettext('Updating...')}`);
            await this.replyWithStatus(ctx.editMessageText, addresses);
        });

        context.configureAction(/window\:select/, async ctx => {
            await ctx.editMessageText(`⏳ ${gettext('Updating list...')}`);
            await this.replyWithStatus(ctx.editMessageText, this._windowsManager.addresses, true);
        });

        context.configureAction(/window\:(\w+)(\:(\w+))?/, async ctx => {
            let command: string = ctx.match[1];

            let address: number = parseInt(ctx.match[3]);
            address = isNaN(address) ? null : address;

            let waitingMessage;

            switch (command) {
                case 'open':
                    waitingMessage = `⏳ ${gettext('Opening...')}`;
                    break;
                case 'close':
                    waitingMessage = `⏳ ${gettext('Closing...')}`;
                    break;
                case 'reset':
                    waitingMessage = `⏳ ${gettext('Resetting...')}`;
                    break;
                default:
                    console.log(`Windows > Not supported command '${command}'`);
                    return;
            }
            
            await ctx.editMessageText(waitingMessage);

            let windows: number[] = address == null 
                ? this._windowsManager.addresses
                : [address]

            for (let i = 0; i < windows.length; i++) {
                if (i > 0) {
                    // Delay between windows. It may give a big current if open windows simultaneously
                    await new Promise(resolve => setTimeout(resolve, this._delayBetweenGlobalWindowCommandsInMs));
                }

                await this._windowsManager.sendCommand(windows[i], command);
            }

            await this.replyWithStatus(ctx.editMessageText, windows);
        });
    }

    private async replyWithStatus(replyCallback: any, addresses: number[], selectWindow: boolean = false): Promise<void> {
        let result: string = '';

        let states: WindowState[] = [];

        for (let i = 0; i < addresses.length; i++) {
            let address: number = addresses[i];
            let response: SendCommmandResponse = await this._windowsManager.sendCommand(address, 'state');
            let rawStateString: string = this.stateToString(response.state);
            let stateString: string;

            switch (response.state) {
                case WindowState.Closed:
                    stateString = `️️☁️ ${rawStateString}`;
                    break;
                case WindowState.Closing:
                    stateString = `⬇️ ${rawStateString}`;
                    break;
                case WindowState.Open:
                    stateString = `️️🔅 ${rawStateString}`;
                    break;
                case WindowState.Opening:
                    stateString = `⬆️ ${rawStateString}`;
                    break;
                case WindowState.Error:
                    stateString = `⚠️ ${rawStateString} (${this.errorCodeToString(response.errorCode, response.errorState)})`;
                    break;
                case WindowState.CommunicationError:
                case WindowState.NotResponding:
                default:
                    stateString = `⚠️ ${rawStateString}`;
                    break;
            }

            states.push(response.state);
            result += `${gettext('Window')} ${address}: ${stateString}\n`;
        }

        let buttonInfos: ButtonInfo[] = [];

        if (selectWindow) {
            buttonInfos.push({ title: '⬅️', action: this.createAddressCommand('refresh', this._windowsManager.addresses) })
            for (let i = 0; i < addresses.length; i++) { 
                buttonInfos.push({ title: `${gettext('Window')} ${addresses[i]}`, action: this.createAddressCommand('refresh', [addresses[i]]) });    
            }
        } else {
            if (this._windowsManager.addresses.length > 1 && addresses.length == 1) {
                buttonInfos.push({ title: '⬅️', action: this.createAddressCommand('refresh', this._windowsManager.addresses) })
            }
            
            buttonInfos.push({ title: '🔄', action: this.createAddressCommand('refresh', addresses) });
               
            if (states.findIndex(s => s == WindowState.Open) != -1)
                buttonInfos.push({ title: gettext('Close'), action: this.createAddressCommand('close', addresses) })
    
            if (states.findIndex(s => s == WindowState.Closed) != -1)
                buttonInfos.push({ title: gettext('Open', 'Action'), action: this.createAddressCommand('open', addresses) })
    
            if (states.findIndex(s => s == WindowState.CommunicationError 
                    || s == WindowState.Error 
                    || s == WindowState.NotResponding) != -1)
                buttonInfos.push({ title: gettext('Reset'), action: this.createAddressCommand('reset', addresses) })
    
            if (addresses.length > 1) {
                buttonInfos.push({ title: gettext('Separately'), action: this.createAddressCommand('select', this._windowsManager.addresses) })
            }
        }

        let keyboardLines = [];
        let columnIndex = 0;
        let rowIndex = 0;

        buttonInfos.forEach(b => {
            columnIndex++;

            if (columnIndex > this._buttonsPerLine) {
                columnIndex = 0;
                rowIndex++;
            }

            if (keyboardLines[rowIndex] == null)
                keyboardLines[rowIndex] = [];
            
            let row = keyboardLines[rowIndex];

            row[columnIndex] = Markup.callbackButton(b.title, b.action);
        });

        replyCallback(result, Markup.inlineKeyboard(keyboardLines).extra());
    }

    private createAddressCommand(command: string, addresses: number[]): string {
        let expression = `window:${command}`;

        if (addresses.length == 1) {
            expression += `:${addresses[0]}`;
        }

        return expression;
    }

    private stateToString(state: WindowState): string {
        switch (state) {
            case WindowState.CommunicationError:
                return gettext('Data transmit failure');
            case WindowState.NotResponding:
                return gettext('Not responding');
            case WindowState.Error:
                return `${gettext('Failure')} `;
            case WindowState.Closed:
                return gettext('Closed');
            case WindowState.Closing:
                return gettext('Closing');
            case WindowState.Open:
                return gettext('Open', 'State');
            case WindowState.Opening:
                return gettext('Opening');
            default:
                return `${gettext('Unknown state')} '${state}'`;
        }
    }

    private errorCodeToString(errorCode: string, errorState: WindowState): string {
        switch (errorCode) {
            case 'HIGH_CURRENT':
                return gettext('Too high current in state {state}').formatUnicorn({state: this.stateToString(errorState)});
            case 'UP_DOWN_ENABLED':
                return gettext('Start failure. Up and down limits have been enabled');
            case 'UP_ENABLED':
                return gettext('Closed failure. Up limit has been enabled');
            case 'DOWN_DISABLED':
                return gettext('Closed failure. Down limit has been disabled');
            case 'TIMEOUT_UP_STILL_ENABLED':
                return gettext('Closing timeout. Up limit is still enabled');
            case 'TIMEOUT_DOWN_NOT_ENABLED':
                return gettext('Closing timeout. Down limit has not been enabled');
            case 'DOWN_ENABLED':
                return gettext('Open failure. Down limit has been enabled');
            case 'UP_DISABLED':
                return gettext('Open failure. Up limit has been disabled');
            case 'TIMEOUT_DOWN_STILL_ENABLED':
                return gettext('Opening timeout. Down limit is still enabled');
            case 'TIMEOUT_UP_NOT_ENABLED':
                return gettext('Opening timeout. Up limit has not been enabled');
            default:
                return errorCode;
        }
    }
}

class ButtonInfo {
    public title: string;

    public action: string;
}