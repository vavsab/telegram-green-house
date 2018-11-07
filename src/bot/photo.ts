import { IBotModule, InitializeContext } from './bot-module'
import { gettext } from '../gettext';

export class Photo implements IBotModule {
    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'photo', button: `🏞 ${gettext('Photo')}`, regex: new RegExp(gettext('Photo')), row: 1, isEnabled: true, order: 1 });
    }    
    
    initialize(context: InitializeContext): void {
        context.configureAnswerFor('photo', async ctx => {
             
            let result = await context.botApp.telegram.sendMessage(ctx.chat.id, `⏳ ${gettext('Photo is creating...')}`);
            let statusMessageId = result.message_id;

            try {
                let photoPath = await context.greenHouse.takePhoto();
                await ctx.replyWithPhoto({ source: photoPath });
            } catch (error) {
                await ctx.reply(`️️⚠️ ${gettext('Failure')}: ${error}`);
            }

            context.botApp.telegram.deleteMessage(ctx.chat.id, statusMessageId);
        })
    }
}