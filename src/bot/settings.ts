import { IBotModule, InitializeContext, IKeyboardItem, IBotContext } from './bot-module'
import * as diskspace from 'diskspace';
import * as os from 'os';
import { databaseController } from '../database-controller';
import { Markup } from 'telegraf';
import { gettext } from '../gettext';
import { InlineKeyboardButton, CallbackButton } from 'telegraf/typings/markup';
import { IncomingMessage } from 'telegraf/typings/telegram-types';
import { WindowsConfig, DbConfigManager, SensorsConfig, PhotoConfig } from '../green-house/db-config/db-config-manager';

export class Settings implements IBotModule {
    initializeMenu(addKeyboardItem: (item: IKeyboardItem) => void): void {
        addKeyboardItem({ id: 'settings', button: `⚙️ ${gettext('Settings')}`, regex: new RegExp(gettext('Settings')), row: 2, isEnabled: true, order: 100 });
    }

    initialize(context: InitializeContext): void {
        const botConfig = context.config.bot;

        const showStatus = async reply => {
            try {
                const sensorsConfig = await context.dbConfig.get(SensorsConfig);
                const photoConfig = await context.dbConfig.get(PhotoConfig);

                let messageParts = [];
                messageParts.push(`↔️ ${gettext('Allowed range')} 🌡: *${sensorsConfig.coldTemperatureThreshold} - ${sensorsConfig.hotTemperatureThreshold} °C*`);
                messageParts.push(`⚡️ ${gettext('Notification on exceeding: every *{min} min*').formatUnicorn({ min: sensorsConfig.notifyUserAboutTemperatureDangerEveryXMinutes })}`)
                messageParts.push(`💾 ${gettext('Save sensors data: every *{min} min*').formatUnicorn({ min: sensorsConfig.saveIntoDbEveryXMinutes })}`)
                messageParts.push(`🕘 ${gettext('Delay before taking a photo: *{sec} sec*').formatUnicorn({ sec: photoConfig.delayBeforeShotInSeconds })}`)
                messageParts.push(`🔆 ${gettext('Lights on range: {range}').formatUnicorn({ range: botConfig.switchOnLightsTimeRange })}`)

                let diskspaceInfo = await new Promise((resolve, reject) => {
                    const rootDir = os.platform().toString() == 'win32' ? 'C' : '/';
                    diskspace.check(rootDir, (err, result) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        const free = result.free / 1024 / 1024 / 1024;
                        const total = result.total / 1024 / 1024 / 1024;
                        const percents = result.used / result.total * 100;

                        const statistics = {
                            percent: percents.toFixed(0),
                            free: free.toFixed(1),
                            total: total.toFixed(1)
                        };

                        resolve(`📂 ${gettext('Hard drive: *{percent}%* (*{free}* GB free of *{total}* GB)').formatUnicorn(statistics)}`);
                    });
                })

                messageParts.push(diskspaceInfo)

                const databaseSpaceInfo = await databaseController.run(async db => {
                    const stats = await db.stats()
                    const storageSize = stats.storageSize / 1024 / 1024;
                    return `🛢 ${gettext('Database: *{size}* MB').formatUnicorn({size: storageSize.toFixed(1)})}`
                })
                
                messageParts.push(databaseSpaceInfo)

                const buttons: InlineKeyboardButton[] = [];
                
                if (context.config.webPanel.isEnabled && context.config.webPanel.link) {
                    buttons.push(Markup.urlButton(gettext('Website'), context.config.webPanel.link));
                }

                if (context.config.webEmulator.isEnabled && context.config.webEmulator.link) {
                    buttons.push(Markup.urlButton(gettext('Emulator'), context.config.webEmulator.link));
                }

                buttons.push(Markup.callbackButton(`✏️↔️ ${gettext('Safe range')}`, 'settings_sensors_threshold'));
                buttons.push(Markup.callbackButton(`✏️⚡️ ${gettext('Notification interval')}`, 'settings_sensors_notification'));
                buttons.push(Markup.callbackButton(`✏️💾 ${gettext('Save interval')}`, 'settings_sensors_db_save'));
                buttons.push(Markup.callbackButton(`✏️🕘 ${gettext('Photo delay')}`, 'settings_photo_delay'));
                buttons.push(Markup.callbackButton(`⚙️ ${gettext('Windows')}`, 'settings_windows'));

                const settingsKeyboard: InlineKeyboardButton[][] = [];
                let settingsKeyboardLine: InlineKeyboardButton[] = [];
                for (let i = 0; i < buttons.length; i++) {
                    if (i % 2 === 0 && i !== 0) {
                        settingsKeyboard.push(settingsKeyboardLine);
                        settingsKeyboardLine = [];
                    }

                    settingsKeyboardLine.push(buttons[i]);
                }

                if (settingsKeyboardLine.length > 0) {
                    settingsKeyboard.push(settingsKeyboardLine);
                }

                reply(messageParts.join('\n'), Markup.inlineKeyboard(settingsKeyboard).extra({ parse_mode: 'Markdown' }));
            } catch (err) {
                let errMessage = `Telegram > Error while getting settings: ${err}`;
                console.error(errMessage)
                reply(`⚠️ ${errMessage}`);
            }
        }

        context.configureAnswerFor('settings', ctx => showStatus(ctx.reply));

        context.configureAction(/settings$/, ctx => showStatus(ctx.editMessageText));

        const showWindowsSettings = async ctx => {

            const windowsConfig = await context.dbConfig.get(WindowsConfig);

            let messageParts = [];
            messageParts.push(`Windows settings`);
            messageParts.push(`🎚 ${gettext('Auto close/open')}: *${windowsConfig.automateOpenClose ? `✅ ${gettext('on')}` : `🚫 ${gettext('off')}`}*`);
            messageParts.push(`🌡 ${gettext('Close temperature')}: *${windowsConfig.closeTemperature}* °C`);
            messageParts.push(`🌡 ${gettext('Open temperature')}: *${windowsConfig.openTemperature}* °C`);

            let settingsKeyboard: any[] = [];

            settingsKeyboard.push(Markup.callbackButton('⬅️', 'settings'));
            settingsKeyboard.push(Markup.callbackButton(`✏️ ${gettext('Close/Open')}`, 'settings_windows_closeOpenThreshold'));

            if (windowsConfig.automateOpenClose) {
                settingsKeyboard.push(Markup.callbackButton(`🚫 ${gettext('Auto off')}`, 'settings_windows_automate_off'));
            } else {
                settingsKeyboard.push(Markup.callbackButton(`✅ ${gettext('Auto on')}`, 'settings_windows_automate_on'));
            }

            ctx.editMessageText(messageParts.join('\n'), Markup.inlineKeyboard(settingsKeyboard).extra({ parse_mode: 'Markdown' }));
        };

        context.configureAction(/settings_windows$/, showWindowsSettings);

        context.configureAction(/settings_windows_automate_off/, async ctx => {
            const from = ctx.from;
            await context.dbConfig.set(WindowsConfig, { automateOpenClose: false }, `${from.first_name} ${from.last_name} (${from.id})`);
            await ctx.answerCbQuery(gettext('Automation was switched off'));
            await showWindowsSettings(ctx);
        });

        context.configureAction(/settings_windows_automate_on/, async ctx => {
            const from = ctx.from;
            await context.dbConfig.set(WindowsConfig, { automateOpenClose: true }, `${from.first_name} ${from.last_name} (${from.id})`);
            await ctx.answerCbQuery(gettext('Automation was switched on'));
            await showWindowsSettings(ctx);
        });

        const releaseActions = []

        const editSetting = async (
            key: string,
            header: string,
            ctx: IBotContext,
            reply,
            valueApplier: ValueApplier,
            backMenu: string,
            message?: IncomingMessage,
            release?: () => Promise<void>) => {
            if (release && ctx.updateType === 'callback_query' && releaseActions.find(x => x == ctx.callbackQuery.data)) {
                return await release();
            }

            ctx.session.lock = `settings_${key}`;

            let messageParts = [];
            let settingsKeyboard: InlineKeyboardButton[] = [];

            messageParts.push(`✏️ ${header}`);

            if (message && message.text) {
                const { success, details } = await valueApplier({ botContext: ctx, dbConfig: context.dbConfig, value: message.text });
                if (success) {
                    ctx.session.lock = null;
                    messageParts.push(`✅ ${gettext('Value {value} was saved').formatUnicorn({ value: details })}`);
                } else {
                    messageParts.push(`⚠️ ${details}`);
                }
            } else {
                messageParts.push(`⌨️ ${gettext('Please send a new value')}:`);
            }

            settingsKeyboard.push(Markup.callbackButton('⬅️', backMenu));

            await reply(messageParts.join('\n'), Markup.inlineKeyboard(settingsKeyboard).extra({ parse_mode: 'Markdown' }));
        }

        const configureSetting = (key: string, header: string, valueApplier: ValueApplier, backMenu: string) => {
            releaseActions.push(backMenu);

            const regex = new RegExp(`settings_${key}`);

            context.configureSessionAction(regex, async (ctx, release) => {
                await editSetting(key, header, ctx, ctx.reply, valueApplier, backMenu, ctx.message, release);
            });
    
            context.configureAction(regex, async ctx => {
                await editSetting(key, header, ctx, ctx.editMessageText, valueApplier, backMenu);
            });
        }

        configureSetting('windows_closeOpenThreshold', gettext('Edit close/open range (format: "15-30" or "15 30")'), this.rangeApplier(5, 50, WindowsConfig, (down, up) => {
            return { closeTemperature: down, openTemperature: up };
        }), 'settings_windows');

        configureSetting('sensors_threshold', gettext('Edit temperature range (format: "15-30" or "15 30")'), this.rangeApplier(5, 50, SensorsConfig, (down, up) => {
            return { coldTemperatureThreshold: down, hotTemperatureThreshold: up };
        }), 'settings');

        configureSetting('sensors_notification', gettext('Edit sensors notification internal (in minutes)'), this.integerApplier(1, 120, SensorsConfig, (value) => {
            return { notifyUserAboutTemperatureDangerEveryXMinutes: value };
        }), 'settings');

        configureSetting('sensors_db_save', gettext('Edit interval of saving sensors data into db (in minutes)'), this.integerApplier(1, 120, SensorsConfig, (value) => {
            return { saveIntoDbEveryXMinutes: value };
        }), 'settings');

        configureSetting('photo_delay', gettext('Edit photo shot delay (in seconds)'), this.integerApplier(0, 60, PhotoConfig, (value) => {
            return { delayBeforeShotInSeconds: value };
        }), 'settings');
    }

    integerApplier<TConfig>(minValue: number, maxValue: number, configRef: new() => TConfig, configBuilder: (value: number) => Partial<TConfig>): ValueApplier {
        return async applierContext => {
            const regex = /\d+/;
            const value = parseInt(applierContext.value);
            if (isNaN(value) || !regex.test(applierContext.value)) {
                return { success: false, details: gettext('Invalid integer number format.') };
            }

            if (value < minValue || value > maxValue) {
                return  { success: false, details: gettext('Value must be in range [{min}..{max}]').formatUnicorn({ min: minValue, max: maxValue }) };
            }
            
            const from = applierContext.botContext.from;
            await applierContext.dbConfig.set(configRef, configBuilder(value), `${from.first_name} ${from.last_name} (${from.id})`);

            return { success: true, details: `${value}` };
        };
    }

    rangeApplier<TConfig>(downLimit: number, upLimit: number, configRef: new() => TConfig, configBuilder: (down: number, up: number) => Partial<TConfig>): ValueApplier {
        return async applierContext => {
            const regex = /(\d+)[ \-](\d+)/;
            const regexArray = regex.exec(applierContext.value);

            if (regexArray == null) {
                return { success: false, details: gettext('Invalid range format. Use "<down>-<up>" or "<down> <up>"') };
            }

            const down = parseInt(regexArray[1]);
            const up = parseInt(regexArray[2]);

            if (down >= up) {
                return  { success: false, details: gettext('Down value is greater or equal up value') };
            }
            
            if (down < downLimit || up > upLimit) {
                return  { success: false, details: `${gettext('Range {down}...{up} is not in range {downLimit}..{upLimit}').formatUnicorn({ down, up, downLimit, upLimit })}` };
            }

            const from = applierContext.botContext.from;
            await applierContext.dbConfig.set(configRef, configBuilder(down, up), `${from.first_name} ${from.last_name} (${from.id})`);

            return { success: true, details: `${down}...${up}` };
        };
    }
}

class ValueApplierContext {
    botContext: IBotContext;

    value: string;

    dbConfig: DbConfigManager;
}

type ValueApplier = (context: ValueApplierContext) => Promise<{ success: boolean, details: string }>;