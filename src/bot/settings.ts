import { IBotModule, InitializeContext } from './bot-module'
import * as diskspace from 'diskspace';
import * as os from 'os';
import { databaseController } from '../databaseController';
import { Markup, Extra } from 'telegraf';
import { gettext } from '../gettext';

export class Settings implements IBotModule {
    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'settings', button: `⚙️ ${gettext('Settings')}`, regex: new RegExp(gettext('Settings')), row: 2, isEnabled: true, order: 100 });
    }

    initialize(context: InitializeContext): void {
        var botConfig = context.config.bot;

        context.configureAnswerFor('settings', async (ctx) => {
            try {
                let messageParts = [];
                messageParts.push(`↔️ ${gettext('Allowed range')} 🌡: *${botConfig.minTemperature} - ${botConfig.maxTemperature} °C*`);
                messageParts.push(`⚡️ ${gettext('Notification on exceeding: every *{min} min*').formatUnicorn({ min: botConfig.intervalBetweenWarningsInMinutes })}`)
                messageParts.push(`💾 ${gettext('Save sensors data: every *{min} min*').formatUnicorn({min: botConfig.saveToDbTimeoutInMinutes})}`)
                messageParts.push(`🕘 ${gettext('Delay before taking a photo: *{sec} sec*').formatUnicorn({sec: botConfig.takePhotoDelayInSeconds})}`)
                messageParts.push(`🔆 ${gettext('Lights on range: {range}').formatUnicorn({range: botConfig.switchOnLightsTimeRange})}`)

                let diskspaceInfo = await new Promise((resolve, reject) => {
                    var rootDir = os.platform().toString() == 'win32' ? 'C' : '/';
                    diskspace.check(rootDir, (err, result) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        var free = result.free / 1024 / 1024 / 1024;
                        var total = result.total / 1024 / 1024 / 1024;
                        var percents = result.used / result.total * 100;

                        let statistics = {
                            percent: percents.toFixed(0),
                            free: free.toFixed(1),
                            total: total.toFixed(1)
                        };

                        resolve(`📂 ${gettext('Hard drive: *{percent}%* (*{free}* GB free of *{total}* GB)').formatUnicorn(statistics)}`);
                    });
                })

                messageParts.push(diskspaceInfo)

                let databaseSpaceInfo = await databaseController.run(async db => {
                    let stats = await db.stats()
                    let storageSize = stats.storageSize / 1024 / 1024;
                    return `🛢 ${gettext('Database: *{size}* MB').formatUnicorn({size: storageSize.toFixed(1)})}`
                })
                
                messageParts.push(databaseSpaceInfo)

                let settingsKeyboard: any[] = [];
                
                if (context.config.webPanel.isEnabled && context.config.webPanel.link) {
                    settingsKeyboard.push(Markup.urlButton(gettext('Website'), context.config.webPanel.link));
                }

                if (context.config.webEmulator.isEnabled && context.config.webEmulator.link) {
                    settingsKeyboard.push(Markup.urlButton(gettext('Emulator'), context.config.webEmulator.link));
                }

                ctx.reply(messageParts.join('\n'), Extra.load({parse_mode: 'Markdown'}).markup(Markup.inlineKeyboard(settingsKeyboard)));
            } catch (err) {
                let errMessage = `Telegram > Error while getting settings: ${err}`;
                console.error(errMessage)
                ctx.reply(errMessage);
            }
        }); 
    }
}