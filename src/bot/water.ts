import { IBotModule, InitializeContext } from './bot-module'
import { Markup } from 'telegraf';
import * as moment from 'moment';
import * as _ from 'lodash';
import { gettext } from '../gettext';
import { WateringValveConfiguration } from '../app-configuration';

export class Water implements IBotModule {

    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'water', button: `🌧 ${gettext('Water')}`, regex: new RegExp(gettext('Water')), row: 2, isEnabled: true, order: 0 });
    }

    initialize(context: InitializeContext): void {
        context.config.bot.watering

        let valveInfos: ValveInfo[] = [];

        if (context.config.bot.watering) {
            for (let valveConfig of context.config.bot.watering.valves) {
                valveInfos.push({
                    config: valveConfig,
                    lastEnableTime: null,
                    duration: null,
                    previousIsEnabled: false
                });
            }
        }        

        const getCurrentStateInfo = (valveId: number): ValveState => {
            let isEnabled = false;
            let timeRemained = null;

            let valveInfo = valveInfos.find(v => v.config.id == valveId);
            if (!valveInfo) {
                throw `Could not find valve info by id ${valveId}`;
            }

            if (valveInfo.lastEnableTime != null) {
                if (valveInfo.duration == null) {
                    isEnabled = true;
                    timeRemained = null;
                } else if (moment().valueOf() - valveInfo.lastEnableTime < valveInfo.duration) {
                    isEnabled = true;
                    timeRemained = valveInfo.duration - (moment().valueOf() - valveInfo.lastEnableTime);
                }
            }

            return {
                isEnabled: isEnabled,
                timeRemained: timeRemained,
                valveInfo: valveInfo
            };
        }

        const updateWaterState = (vavleId: number) => {
            let state = getCurrentStateInfo(vavleId);

            if (state.valveInfo.previousIsEnabled != state.isEnabled) {
                context.greenHouse.setWaterValve(vavleId, state.isEnabled);
                console.log(`Water > Switched water valve ${state.valveInfo.config.name} (with id ${state.valveInfo.config.id}) ${(state.isEnabled ? 'on' : 'off')}`);
            }
            
            state.valveInfo.previousIsEnabled = state.isEnabled;
        };

        let replyWithMessage = (replyCallback: any, keyboard: any, postMessage: string = null, valveId: number = null) => {
            let messageParts = [];

            let valves = valveInfos;
            if (valveId) {
                let valveInfo = valveInfos.find(v => v.config.id == valveId);
                if (!valveInfo) {
                    throw `Could not find valve info by id ${valveId}`;
                }

                valves = [ valveInfo ];
            }

            let valveStates: ValveState[] = [];
            for (const valveInfo of valves) {
                valveStates.push(getCurrentStateInfo(valveInfo.config.id));
            }

            for (const valveState of valveStates) {
                let enabledStateString = '';

                if (valveState.isEnabled) {
                    enabledStateString += `✅ ${gettext('on')}`;
                    if (valveState.timeRemained != null) {
                        let minutes = Math.ceil(moment.duration(valveState.timeRemained).asMinutes());
                        enabledStateString += ` (${gettext('{min} min remained').formatUnicorn({min: minutes})})`;
                    } else {
                        enabledStateString += ` (${gettext('till turning off manually')})`;
                    }
                } else {
                    enabledStateString += `🚫 ${gettext('off')}`;
                }    

                messageParts.push(`${valveState.valveInfo.config.name} ${enabledStateString}`);
            }

            if (postMessage != null) {
                messageParts.push('');
                messageParts.push(postMessage);
            }

            let message = messageParts.join('\n');

            replyCallback(message, keyboard);
        };

        let getDefaultKeyboard = () => {
            let buttons = [];
            buttons.push(Markup.callbackButton('🔄', `water:refresh`));

            for (const valveInfo of valveInfos) {
                buttons.push(Markup.callbackButton(valveInfo.config.name, `water:${valveInfo.config.id}`));
            }

            return Markup.inlineKeyboard(buttons).extra();
        };

        let getWateringControlKeyboard = valveId => {
            let state = getCurrentStateInfo(valveId);

            let buttons = [];
            buttons.push(Markup.callbackButton('⬅️', `water`));
            buttons.push(Markup.callbackButton('🔄', `water:${valveId}:refresh`));

            if (state.isEnabled) {
                buttons.push(Markup.callbackButton(`🚫 ${gettext('Turn off')}`, `water:${valveId}:stop`));
            } else {
                buttons.push(Markup.callbackButton(`✅ ${gettext('Turn on')}`, `water:${valveId}:start`));
            }
            
            return Markup.inlineKeyboard(buttons).extra();
        }

        let getWateringStartKeyboard = valveId => {
            return Markup.inlineKeyboard([
                Markup.callbackButton('⬅️', `water:${valveId}`),
                Markup.callbackButton(gettext('{min} min').formatUnicorn({min: 5}), `water:${valveId}:start:5`),
                Markup.callbackButton(gettext('{min} min').formatUnicorn({min: 30}), `water:${valveId}:start:30`),
                Markup.callbackButton(gettext('{hour} hour').formatUnicorn({hour: 1}), `water:${valveId}:start:60`),
                Markup.callbackButton(gettext('{hours} hours').formatUnicorn({hours: 3}), `water:${valveId}:start:180`),
            ])
            .extra();
        }

        context.configureAnswerFor('water', ctx => {
            replyWithMessage(ctx.reply, getDefaultKeyboard(), gettext('Choose watering valve'));
        });

        context.configureAction(/water(:refresh)?$/, async ctx => {
            await ctx.editMessageText(`⏳ ${gettext('Processing...')}`);
            replyWithMessage(ctx.editMessageText, getDefaultKeyboard(), gettext('Choose watering valve'));
        });

        context.configureAction(/water:(\d+)(:refresh)?$/, async ctx => { 
            let valveId = parseInt(ctx.match[1]);

            await ctx.editMessageText(`⏳ ${gettext('Processing...')}`);
            replyWithMessage(ctx.editMessageText, getWateringControlKeyboard(valveId), null, valveId);
        });

        context.configureAction(/water:(\d+):start(:(\d+))?/, async ctx => { 
            await ctx.editMessageText(`⏳ ${gettext('Processing...')}`);

            let valveId = parseInt(ctx.match[1]);
            let startDurationInMinutes = parseInt(ctx.match[3]);

            let valveInfo = valveInfos.find(v => v.config.id == valveId);
            if (!valveInfo) {
                throw `Could not find valve info by id ${valveId}`;
            }

            if (!isNaN(startDurationInMinutes)) {
                valveInfo.lastEnableTime = moment().valueOf();
                valveInfo.duration = moment.duration(startDurationInMinutes, "minutes").asMilliseconds();

                updateWaterState(valveId);
                replyWithMessage(ctx.editMessageText, getWateringControlKeyboard(valveId), `✅ ${gettext('Watering is on')}`, valveId);
            } else {
                replyWithMessage(ctx.editMessageText, getWateringStartKeyboard(valveId), `▶️ ${gettext('How much time should the watering be turned on?')}`, valveId);
            }
        });

        context.configureAction(/water:(\d+):stop/, async ctx => { 
            await ctx.editMessageText(`⏳ ${gettext('Processing...')}`);

            let valveId = parseInt(ctx.match[1]);

            let valveInfo = valveInfos.find(v => v.config.id == valveId);
            if (!valveInfo) {
                throw `Could not find valve info by id ${valveId}`;
            }

            valveInfo.lastEnableTime = null;
            valveInfo.duration = null;
            updateWaterState(valveId);
            replyWithMessage(ctx.editMessageText, getWateringControlKeyboard(valveId), `🚫 ${gettext('Watering is turned off')}`, valveId);
        });

        let updateAllValveStates = () => {
            for (const valveInfo of valveInfos) {
                updateWaterState(valveInfo.config.id);
            }
        }
        
        updateAllValveStates();
        setInterval(updateAllValveStates, 1000 * 10); // Update state every 10 sec
    }
}

interface ValveInfo {
    config: WateringValveConfiguration,

    lastEnableTime: number,

    duration: number,

    previousIsEnabled: boolean;
}

interface ValveState {
    isEnabled: boolean;

    timeRemained: number;

    valveInfo: ValveInfo
}