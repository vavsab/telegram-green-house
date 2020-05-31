import { IBotModule, InitializeContext } from './bot-module'
import { Markup } from 'telegraf';
import { gettext } from '../gettext';

export class Video implements IBotModule {
    private readonly videoKeyboardMarkup = Markup.inlineKeyboard([
        Markup.callbackButton(gettext('{sec} sec').formatUnicorn({sec: 5}), 'video:5'),
        Markup.callbackButton(gettext('{sec} sec').formatUnicorn({sec: 10}), 'video:10'),
        Markup.callbackButton(gettext('{sec} sec').formatUnicorn({sec: 30}), 'video:30'),
        Markup.callbackButton(gettext('{min} min').formatUnicorn({min: 1}), 'video:60')
    ])
    .extra();

    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'video', button: `🎬 ${gettext('Video')}`, regex: new RegExp(gettext('Video')), row: 1, isEnabled: true, order: 0 });
    }

    initialize(context: InitializeContext): void {
        context.configureAnswerFor('video', ctx => {
            ctx.reply(`🎬 ${gettext('Choose video duration')}`, this.videoKeyboardMarkup)
        });
    
        context.configureAction(/video\:(\d+)/, async ctx => {
            let videoDuration = ctx.match[1];
    
            ctx.editMessageText(`⏳ ${gettext('Please wait while video with duration of *{duration} sec* is recording...').formatUnicorn({duration: videoDuration})}`, {parse_mode: 'Markdown'});

            try {
                let fileName = await context.greenHouse.recordVideo(parseInt(videoDuration));
                await ctx.replyWithVideo({ source: fileName });
                await ctx.deleteMessage();
            } catch (error) {
                ctx.editMessageText(`⚠️ ${gettext('Failure')}: ${error}`);
            }
        });
    }
}