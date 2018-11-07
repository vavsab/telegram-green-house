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
            let stateString: string;

            switch (response.state) {
                case WindowState.CommunicationError:
                    stateString = `⚠️ ${gettext('Data transmit failure')}`;
                    break;
                case WindowState.NotResponding:
                    stateString = `️️⚠️ ${gettext('Not responding')}`;
                    break;
                case WindowState.Error:
                    stateString = `️⚠️ ${gettext('Failure')} (${response.errorText})`;
                    break;
                case WindowState.Closed:
                    stateString = `️️☁️ ${gettext('Closed')}`;
                    break;
                case WindowState.Closing:
                    stateString = `⬇️ ${gettext('Closing')}`;
                    break;
                case WindowState.Open:
                    stateString = `️️🔅 ${gettext('Open', 'State')}`;
                    break;
                case WindowState.Opening:
                    stateString = `⬆️ ${gettext('Opening')}`;
                    break;
                default:
                    stateString = `️⚠️ ${gettext('Unknown state')} '${response.state}'`;
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
}

class ButtonInfo {
    public title: string;

    public action: string;
}