import { IBotModule, InitializeContext, IKeyboardItem } from './bot-module'
import * as diskspace from 'diskspace';
import * as os from 'os';
import { databaseController } from '../databaseController';
import { Markup } from 'telegraf';
import { gettext } from '../gettext';

export class Settings implements IBotModule {
    initializeMenu(addKeyboardItem: (item: IKeyboardItem) => void): void {
        addKeyboardItem({ id: 'settings', button: `⚙️ ${gettext('Settings')}`, regex: new RegExp(gettext('Settings')), row: 2, isEnabled: true, order: 100 });
    }

    initialize(context: InitializeContext): void {
        const botConfig = context.config.bot;

        const showStatus = async reply => {
            try {
                let messageParts = [];
                messageParts.push(`↔️ ${gettext('Allowed range')} 🌡: *${botConfig.minTemperature} - ${botConfig.maxTemperature} °C*`);
                messageParts.push(`⚡️ ${gettext('Notification on exceeding: every *{min} min*').formatUnicorn({ min: botConfig.intervalBetweenWarningsInMinutes })}`)
                messageParts.push(`💾 ${gettext('Save sensors data: every *{min} min*').formatUnicorn({min: botConfig.saveToDbTimeoutInMinutes})}`)
                messageParts.push(`🕘 ${gettext('Delay before taking a photo: *{sec} sec*').formatUnicorn({sec: botConfig.takePhotoDelayInSeconds})}`)
                messageParts.push(`🔆 ${gettext('Lights on range: {range}').formatUnicorn({range: botConfig.switchOnLightsTimeRange})}`)

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

                const settingsKeyboard: any[] = [];
                
                if (context.config.webPanel.isEnabled && context.config.webPanel.link) {
                    settingsKeyboard.push(Markup.urlButton(gettext('Website'), context.config.webPanel.link));
                }

                if (context.config.webEmulator.isEnabled && context.config.webEmulator.link) {
                    settingsKeyboard.push(Markup.urlButton(gettext('Emulator'), context.config.webEmulator.link));
                }

                settingsKeyboard.push(Markup.callbackButton(`⚙️ ${gettext('Windows')}`, 'settings:windows'));

                reply(messageParts.join('\n'), Markup.inlineKeyboard(settingsKeyboard).extra({ parse_mode: 'Markdown' }));
            } catch (err) {
                let errMessage = `Telegram > Error while getting settings: ${err}`;
                console.error(errMessage)
                reply(`⚠️ ${errMessage}`);
            }
        }

        context.configureAnswerFor('settings', ctx => showStatus(ctx.reply));

        context.configureAction(/^settings$/, ctx => showStatus(ctx.editMessageText));

        context.configureAction(/settings\:windows/, async ctx => {
            let messageParts = [];
            messageParts.push(`Windows settings`);
            messageParts.push(`🎚 ${gettext('Auto open/close')}: *${botConfig.minTemperature ? `✅ ${gettext('on')}` : `🚫 ${gettext('off')}`}*`);
            messageParts.push(`🌡 ${gettext('Open temperature')}: *${botConfig.minTemperature}* °C`);
            messageParts.push(`🌡 ${gettext('Close temperature')}: *${botConfig.minTemperature}* °C`);

            let settingsKeyboard: any[] = [];

            settingsKeyboard.push(Markup.callbackButton('⬅️', 'settings'));
            settingsKeyboard.push(Markup.callbackButton(`✏️ ${gettext('Open temperature')}`, 'settings:windows:openThreshold'));
            settingsKeyboard.push(Markup.callbackButton(`✏️ ${gettext('Close temperature')}`, 'settings:windows:closeThreshold'));

            ctx.editMessageText(messageParts.join('\n'), Markup.inlineKeyboard(settingsKeyboard).extra({ parse_mode: 'Markdown' }));
        });
    }
}