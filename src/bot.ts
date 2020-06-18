import { IBotModule, InitializeContext, IKeyboardItem, IBotContext, ISessionActionHandler } from './bot/bot-module';
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
import { Telegraf, Markup } from 'telegraf';
import { gettext } from './gettext';
import * as request from 'request';
import * as _ from 'lodash';
import { TelegrafContext } from 'telegraf/typings/context';
import * as RedisSession from 'telegraf-session-redis';
import { DbConfigManager, ChangedConfig } from './green-house/db-config/db-config-manager';

export class Bot {
    public start(eventEmitter, config: AppConfiguration, greenHouse: IGreenHouse): void {
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
        
        const app = new Telegraf(config.bot.token);
    
        let adminChatId: number = config.bot.adminChatId;
        let allowedChatIds = config.bot.allowedChatIds;
        let firstTimeMessage = {};

        const keyboardItems: IKeyboardItem[] = [];
        botModules.forEach(m => m.initializeMenu(item => keyboardItems.push(item)));
    
        function configureAnswerFor(id: string, answerCallback: (ctx: TelegrafContext) => void) {
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
                if (!allowedChatIds.find(id => id == ctx.chat.id)) {
                    allowedChatIds.push(ctx.chat.id);
                }
            }
    
            if (allowedChatIds.find(id => id == ctx.chat.id)) {
                return next();
            }
    
            app.telegram.sendMessage(adminChatId, `⚠️ ${gettext('Access denied for user {user}, chat: {chat}').formatUnicorn({user: JSON.stringify(ctx.from), chat: JSON.stringify(ctx.chat)})}`);
    
            return ctx.reply(`⚠️ ${gettext('You have no access to this bot.\n If you have any questions, please write @ivan_sabelnikov')}`);
        });

        const session = new (RedisSession as any)({
            store: {
                host: process.env.TELEGRAM_SESSION_HOST || '127.0.0.1',
                port: process.env.TELEGRAM_SESSION_PORT || 6379
            }
        });
          
        app.use(session);

        const sessionActionHandlers: ISessionActionHandler[] = [];

        app.command('/clear', (ctx: IBotContext) => {
            ctx.session = null;
            ctx.reply(`🧹 ${gettext('Session was cleared')}`)
        });

        app.use((ctx: IBotContext, next) => {
            const lock = ctx.session.lock;

            if (!lock) {
                return next();
            }

            var item = sessionActionHandlers.find(i => i.sessionLock.test(lock));
            if (item === undefined) {
                console.error(`Failed to find handler for session lock ${lock}`)
                return next();
            }

            return item.answerCallback(ctx, () => {
                ctx.session.lock = null;
                return next();
            });
        });

        const dbConfig = new DbConfigManager();

        dbConfig.onConfigChanged(changedConfig => {
            const message = `⚠️ ${gettext('Config was changed by {userInfo}. Key {key}, value: {value}').formatUnicorn({
                userInfo: changedConfig.userInfo,
                key: changedConfig.key, 
                value: JSON.stringify(changedConfig.newConfig)
            })}`;

            console.log(message);
            app.telegram.sendMessage(adminChatId, message);
        });
    
        let initializeContext: InitializeContext = {
            configureAnswerFor: configureAnswerFor,
            configureAction: (trigger, actionCallback) => app.action(trigger, async ctx => await actionCallback(ctx)),
            configureSessionAction: (sessionLock, answerCallback) => sessionActionHandlers.push({ sessionLock, answerCallback }),
            botApp: app,
            config: config,
            allowedChatIds: allowedChatIds,
            adminChatId: adminChatId,
            eventEmitter: eventEmitter,
            greenHouse: greenHouse,
            dbConfig: dbConfig
        }
    
        botModules.forEach(m => m.initialize(initializeContext));
    
        const keyboardButtons = _(keyboardItems)
            .filter(i => i.isEnabled)
            .groupBy(i => i.row)
            .orderBy(g => g[0].row)
            .map(g => _(g).orderBy(i => i.order).map(i => i.button).value())
            .value();
    
        const keyboard = Markup
            .keyboard(keyboardButtons)
            .oneTime(false)
            .resize()
            .extra()
    
        app.on('text', (ctx) => {
            return ctx.reply(gettext('Choose a command'), keyboard)
        })
    
        app.catch((err) => {
            console.log('Telegram > Error: ', err)
        })
    
        app.startPolling()
        eventEmitter.emit('botStarted');

        if (config.downDetector 
            && config.downDetector.endpoint 
            && config.downDetector.id
            && config.downDetector.pingIntervalMs) {
            console.log('Down detector is enabled');

            const pingDownDetector = () => {
                request.post(config.downDetector.endpoint, {form: { id: config.downDetector.id }}, err => {
                    if (err) {
                        console.log('DownDetector > Error: ', err);
                    }
                });

                setTimeout(pingDownDetector, config.downDetector.pingIntervalMs);
            };
            
            pingDownDetector();
        } else {
            console.log('Down detector is disabled');
        }
    }
}
