import { IBotModule, InitializeContext } from './bot-module'
import { Markup } from 'telegraf';

export class Video implements IBotModule {
    private readonly videoKeyboardMarkup = Markup.inlineKeyboard([
        Markup.callbackButton('5 сек', 'video:5'),
        Markup.callbackButton('10 сек', 'video:10'),
        Markup.callbackButton('30 сек', 'video:30'),
        Markup.callbackButton('1 мин', 'video:60')
    ])
    .extra();

    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'video', button: '🎬 Видео', regex: /Видео/, row: 1, isEnabled: true, order: 0 });
    }

    initialize(context: InitializeContext): void {
        context.configureAnswerFor('video', ctx => {
            ctx.reply('🎬 Выберите длительность видео', this.videoKeyboardMarkup)
        });
    
        context.configureAction(/video\:(\d+)/, async ctx => {
            let videoDuration = ctx.match[1];
    
            ctx.editMessageText(`⏳ Подождите, видео длиной *${videoDuration} сек* записывается...`, {parse_mode: 'Markdown'});

            try {
                let fileName = await context.greenHouse.recordVideo(videoDuration);
                await ctx.replyWithVideo({ source: fileName });
                await ctx.deleteMessage();
            } catch (error) {
                ctx.editMessageText(`⚠️ Ошибка: ${error}`);
            }
        });
    }
}