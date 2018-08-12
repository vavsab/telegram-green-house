import { IBotModule, InitializeContext } from './bot-module'
import * as diskspace from 'diskspace';
import * as os from 'os';
import { databaseController } from '../databaseController';
import { Markup, Extra } from 'telegraf';

export class Settings implements IBotModule {
    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'settings', button: '⚙️ Настройки', regex: /Настройки/, row: 2, isEnabled: true, order: 100 });
    }

    initialize(context: InitializeContext): void {
        var botConfig = context.config.bot;

        context.configureAnswerFor('settings', async (ctx) => {
            try {
                let messageParts = [];
                messageParts.push(`↔️ Допустимый диапазон 🌡: *${botConfig.minTemperature} - ${botConfig.maxTemperature} °C*`);
                messageParts.push(`⚡️ Оповещение при нарушениях: каждые *${botConfig.intervalBetweenWarningsInMinutes} мин*`)
                messageParts.push(`💾 Сохранение показаний датчиков: каждые *${botConfig.saveToDbTimeoutInMinutes} мин*`)
                messageParts.push(`🕘 Задержка при включении камеры: *${botConfig.takePhotoDelayInSeconds} сек*`)            
                messageParts.push(`🔆 Включение света: ${botConfig.switchOnLightsTimeRange}`);

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
                        resolve(`📂 Диск: *${percents.toFixed(0)}%* (*${free.toFixed(1)}* GB свободно из *${total.toFixed(1)}* GB)`);
                    });
                })

                messageParts.push(diskspaceInfo)

                let databaseSpaceInfo = await databaseController.run(async db => {
                    let stats = await db.stats()
                    let storageSize = stats.storageSize / 1024 / 1024;
                    return `🛢 База данных: *${storageSize.toFixed(1)}* MB`
                })
                
                messageParts.push(databaseSpaceInfo)

                let settingsKeyboard: any[] = [];
                
                if (context.config.webPanel.isEnabled && context.config.webPanel.link) {
                    settingsKeyboard.push(Markup.urlButton('Вебсайт', context.config.webPanel.link));
                }

                if (context.config.webEmulator.isEnabled && context.config.webEmulator.link) {
                    settingsKeyboard.push(Markup.urlButton('Эмулятор', context.config.webEmulator.link));
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