import { Markup } from 'telegraf';
import { IBotModule, InitializeContext } from './bot-module'
import { WindowCommand } from '../green-house/green-house';
import { RaspiGreenHouse } from '../green-house/raspi-green-house';

export class Windows implements IBotModule {
    private readonly manualStartKeyboard = Markup.inlineKeyboard([[
        Markup.callbackButton('Открыть', 'window:open'),
        Markup.callbackButton('Закрыть', 'window:close'),
    ], [
        Markup.callbackButton('Сброс', 'window:reset'),
        Markup.callbackButton('Состояние', 'window:state')
    ]])
    .extra(); 

    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'windows', button: '♻️ Окна', regex: /Окна/, row: 2, isEnabled: true, order: 0 });
    }    
    
    initialize(context: InitializeContext): void {
        context.configureAnswerFor('windows', ctx => {
            ctx.reply(`️️️️️️⚠️ Управление окнами еще не реализовано. Режим разработчика.`, this.manualStartKeyboard);
        });

        context.configureAction(/window\:open/, ctx => {
            context.greenHouse.sendWindowCommand(new WindowCommand(5, 'open'));
            ctx.reply(`️️️️️️⚠️ Окна открываются...`);
        });

        context.configureAction(/window\:close/, ctx => {
            context.greenHouse.sendWindowCommand(new WindowCommand(5, 'close'));
            ctx.reply(`️️️️️️⚠️ Окна закрываются...`);
        });

        context.configureAction(/window\:reset/, ctx => {
            context.greenHouse.sendWindowCommand(new WindowCommand(5, 'reset'));
            ctx.reply(`️️️️️️⚠️ Окна переинициализируются...`);
        });

        context.configureAction(/window\:state/, ctx => {
            context.greenHouse.sendWindowCommand(new WindowCommand(5, 'state'));
            ctx.reply(`️️️️️️⚠️ Запрос на состояние окна выслан...`);
        });

        (<RaspiGreenHouse>context.greenHouse).eventEmitter.on('serial-data', msg => {
            context.botApp.telegram.sendMessage(context.adminChatId, msg);
        });
    }
}

  