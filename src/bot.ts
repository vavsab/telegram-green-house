import { IBotModule, InitializeContext } from './bot/bot-module';
import { Windows } from './bot/windows';
import { Water } from './bot/water';
import { Weather } from './bot/weather';
import { Video } from './bot/video';
import { Chart } from './bot/chart';
import { Settings } from './bot/settings';
import { Sensors } from './bot/sensors';
import { Photo } from './bot/photo';
import { AppConfiguration } from './app-configuration';
import { IGreenHouse } from './green-house/green-house';
import * as Telegraf from 'telegraf';

export class Bot {
    public start(eventEmitter, config: AppConfiguration, greenHouse: IGreenHouse): void {
        const _ = require('lodash');
    
        const botModules : IBotModule[] = [];
    
        function tryAddBotModule<TModule extends IBotModule>(type: new() => TModule, isEnabled: boolean) {
            if (isEnabled) {
                botModules.push(new type());
            }
        }
    
        tryAddBotModule(Sensors, config.bot.modules.sensors);
        tryAddBotModule(Settings, config.bot.modules.settings);
        tryAddBotModule(Chart, config.bot.modules.chart);
        tryAddBotModule(Photo, config.bot.modules.photo);
        tryAddBotModule(Video, config.bot.modules.video);
        tryAddBotModule(Weather, config.bot.modules.weather);
        tryAddBotModule(Water, config.bot.modules.water);
        tryAddBotModule(Windows, config.bot.modules.windows);
        
        const app = new Telegraf(config.bot.token)
    
        let adminChatId:number = config.bot.adminChatId;
        let allowedChatIds = config.bot.allowedChatIds
        let firstTimeMessage = {};
    
        var keyboardItems = [];
        botModules.forEach(m => m.initializeMenu(item => keyboardItems.push(item)));
    
        function configureAnswerFor(id, answerCallback) {
            var item = keyboardItems.find(i => i.id == id);
            if (item === undefined || !item.isEnabled)
                return;
    
            app.hears(item.regex, answerCallback);
        }
    
        app.use((ctx, next) => {
    
            if (!firstTimeMessage[ctx.chat.id]) {
                console.log(`First request from: ${JSON.stringify(ctx.from)}, chat: ${JSON.stringify(ctx.chat)}`)
                firstTimeMessage[ctx.chat.id] = true;
            }
    
            if (config.bot.grantAccessForAllUsers) {
                return next();
            }
    
            for (let i = 0; i < allowedChatIds.length; i++) {
                if (allowedChatIds[i] == ctx.chat.id) {
                    return next();
                }
            }
    
            app.telegram.sendMessage(adminChatId, `⚠️ Отказано в доступе пользователю ${JSON.stringify(ctx.from)}, chat: ${JSON.stringify(ctx.chat)}`);
    
            return ctx.reply('⚠️ У вас нет доступа для использования этого бота.\n'
                            + 'При необходимости обратитесь к @ivan_sabelnikov.');
        });
    
        let initializeContext: InitializeContext = {
            configureAnswerFor: configureAnswerFor,
            configureAction: (actionText, actionCallback) => app.action(actionText, ctx => actionCallback(ctx)),
            botApp: app,
            config: config,
            allowedChatIds: allowedChatIds,
            adminChatId: adminChatId,
            eventEmitter: eventEmitter,
            greenHouse: greenHouse
        }
    
        botModules.forEach(m => m.initialize(initializeContext));
    
        const keyboardButtons = _(keyboardItems)
            .filter(i => i.isEnabled)
            .groupBy(i => i.row)
            .orderBy(g => g[0].row)
            .map(g => _(g).orderBy(i => i.order).map(i => i.button).value())
            .value();
    
        const keyboard = Telegraf.Markup
            .keyboard(keyboardButtons)
            .oneTime(false)
            .resize()
            .extra()
    
        app.on('text', (ctx) => {
            return ctx.reply('Выберите команду', keyboard)
        })
    
        app.catch((err) => {
            console.log('Telegram > Error: ', err)
        })
    
        app.startPolling()
        eventEmitter.emit('botStarted');
    }
}
