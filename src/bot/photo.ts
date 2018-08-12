import { IBotModule, InitializeContext } from './bot-module'

export class Photo implements IBotModule {
    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'photo', button: '🏞 Фото', regex: /Фото/, row: 1, isEnabled: true, order: 1 });
    }    
    
    initialize(context: InitializeContext): void {
        context.configureAnswerFor('photo', async ctx => {
             
            let result = await context.botApp.telegram.sendMessage(ctx.chat.id, '⏳ Фото снимается...');
            let statusMessageId = result.message_id;

            try {
                let photoPath = await context.greenHouse.takePhoto();
                await ctx.replyWithPhoto({ source: photoPath });
            } catch (error) {
                await ctx.reply(`️️⚠️ Ошибка: ${error}`);
            }

            context.botApp.telegram.deleteMessage(ctx.chat.id, statusMessageId);
        })
    }
}