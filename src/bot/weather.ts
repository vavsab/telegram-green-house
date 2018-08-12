import { IBotModule, InitializeContext } from './bot-module'
import * as webshot from 'webshot';

export class Weather implements IBotModule {
    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'weather', button: '🌦 Погода', regex: /Погода/, row: 0, isEnabled: true, order: 3 });
    }

    initialize(context: InitializeContext): void {
        context.configureAnswerFor('weather', (ctx) => {
            let statusMessageId = null
        
            context.botApp.telegram.sendMessage(ctx.chat.id, '⏳ Скачиваю погоду...')
            .then(result => result.message_id)
            .then(messageId => {
                statusMessageId = messageId;
        
                return new Promise((resolve, reject) => {
                    const fileName = '../weather.png';
                    const address = context.config.bot.weatherLink;
                    webshot(address, fileName, {shotOffset: {top: 100} }, function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            ctx.replyWithPhoto({ source: fileName })
                            .then(() => resolve(), reason => reject(reason));
                        }
                    });
                })
            })
            .then(() => {
                context.botApp.telegram.deleteMessage(ctx.chat.id, statusMessageId);
            });
        });
    }
}