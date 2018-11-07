import { IBotModule, InitializeContext } from './bot-module'
import { Markup } from 'telegraf';
import * as moment from 'moment';
import * as _ from 'lodash';
import { gettext } from '../gettext';

export class Water implements IBotModule {

    private readonly manualKeyboard = Markup.inlineKeyboard([
        Markup.callbackButton(`🚫 ${gettext('Turn off')}`, 'water:stop'),
        Markup.callbackButton(`✅ ${gettext('Turn on')}`, 'water:start'),
        Markup.callbackButton(`🔧 ${gettext('Settings')}`, 'water:settings'),
    ])
    .extra();
    
    private readonly autoKeyboard = Markup.inlineKeyboard([
        Markup.callbackButton(`🚫 ${gettext('Turn off')}`, 'water:stop'),
        Markup.callbackButton(`🔧 ${gettext('Settings')}`, 'water:settings'),
    ])
    .extra();
    
    private readonly manualStartKeyboard = Markup.inlineKeyboard([
        Markup.callbackButton('⬅️', 'water:start:back'),
        Markup.callbackButton(gettext('{min} min').formatUnicorn({min: 5}), 'water:start:5'),
        Markup.callbackButton(gettext('{min} min').formatUnicorn({min: 30}), 'water:start:30'),
        Markup.callbackButton(gettext('{hour} hour').formatUnicorn({hour: 1}), 'water:start:60'),
        Markup.callbackButton('∞', 'water:start:-1')
    ])
    .extra();
    
    private readonly settingsKeyboard = Markup.inlineKeyboard([
        Markup.callbackButton('⬅️', 'water:settings:back'),
        Markup.callbackButton(gettext('To manual'), 'water:settings:manual'),
        Markup.callbackButton(gettext('To auto'), 'water:settings:auto'),
        //Markup.callbackButton('🔧 Авто', 'water:settings:time'),
    ])
    .extra();

    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'water', button: `🌧 ${gettext('Water')}`, regex: new RegExp(gettext('Water')), row: 2, isEnabled: true, order: 0 });
    }

    initialize(context: InitializeContext): void {
        let waterSettings = {
            id: "water",
            isManualMode: true,
            manualInfo: {
                lastEnableTime: null,
                duration: null
            },
            autoModeTimeSpans: [{ 
                    from: moment.duration("07:00").asMilliseconds(), 
                    to: moment.duration("07:30").asMilliseconds() 
                }, { 
                    from: moment.duration("18:00").asMilliseconds(), 
                    to: moment.duration("18:30").asMilliseconds() 
                }
            ]
        };

        let setManualMode = (isManualMode) => {
            // Switch off water when change the mode
            if (waterSettings.isManualMode != isManualMode) {
                waterSettings.manualInfo.lastEnableTime = null;
                waterSettings.manualInfo.duration = null;
            } 

            waterSettings.isManualMode = isManualMode;
        }

        const getCurrentStateInfo = () => {
            let isEnabled = false;
            let timeRemained = null;

            if (waterSettings.isManualMode) {
                let manualInfo = waterSettings.manualInfo;

                if (manualInfo.lastEnableTime != null)
                {
                    if (manualInfo.duration == null) {
                        isEnabled = true;
                        timeRemained = null;
                    } else if (moment().valueOf() - manualInfo.lastEnableTime < manualInfo.duration) {
                        isEnabled = true;
                        timeRemained = manualInfo.duration - (moment().valueOf() - manualInfo.lastEnableTime);
                    }
                }
            } else {
                let timeOfDay = moment().diff(moment().startOf("day"));

                let activeTimespan = _(waterSettings.autoModeTimeSpans)
                    .filter(s => timeOfDay >= s.from && timeOfDay <= s.to)
                    .orderBy(s => s.to)
                    .last();

                if (activeTimespan != null) {
                    isEnabled = true;
                    timeRemained = activeTimespan.to - timeOfDay;
                }
            }

            return {
                isManualMode: waterSettings.isManualMode,
                isEnabled: isEnabled,
                timeRemained: timeRemained
            };
        }

        let oldState = null;
        const updateWaterState = () => {
            let state = getCurrentStateInfo();

            if (oldState != state.isEnabled){
                context.greenHouse.setWaterValve(state.isEnabled);
                console.log('Water > Switched water valve ' + (state.isEnabled ? 'on' : 'off'));
            }
            
            oldState = state.isEnabled;
        };

        let getMessage = (postMessage:String = null) => {
            let messageParts = [];
            let state = getCurrentStateInfo();

            let titleString = `🌧 ${gettext('Water control:')}`;
            if (state.isManualMode) {
                titleString += ` 👋 ${gettext('manual')}`;
            } else {
                titleString += ` 🕐 ${gettext('auto')}`;
            }

            if (context.greenHouse.isEmulator) {
                titleString += ` (${gettext('test mode')})`;
            }

            messageParts.push(titleString);

            let enabledStateString = `⚡️ ${gettext('State:')}`;
            if (state.isEnabled) {
                enabledStateString += ` ✅ ${gettext('on')}`;
                if (state.timeRemained != null) {
                    let minutes = Math.trunc(moment.duration(state.timeRemained).asMinutes());
                    enabledStateString += ` (${gettext('{min} min remained').formatUnicorn({min: minutes})})`;
                } else {
                    enabledStateString += ` (${gettext('till turning off manually')})`;
                }
            } else {
                enabledStateString += ` ⏹ ${gettext('off')}`;
            }

            messageParts.push(enabledStateString);
            messageParts.push('');
            messageParts.push(gettext('Turned on time in automatic mode'));

            _(waterSettings.autoModeTimeSpans)
                .orderBy(s => s.from)
                .forEach(s => {
                    let from = moment().startOf("day").add(moment.duration(s.from));
                    let to = moment().startOf("day").add(moment.duration(s.to));
                    messageParts.push(`🕐${from.format('HH:mm')} - ${to.format('HH:mm')}`);
                })

            if (postMessage != null) {
                messageParts.push('');
                messageParts.push(postMessage);
            }

            return messageParts.join('\n');
        };

        let getDefaultKeyboard = () => {
            return waterSettings.isManualMode ? this.manualKeyboard : this.autoKeyboard;
        };

        context.configureAnswerFor('water', ctx => {
            ctx.reply(getMessage(), getDefaultKeyboard());
        });

        context.configureAction(/water:start:?([^:]*)/, ctx => { 
            let command = ctx.match[1];

            let startDurationInMinutes = parseInt(command);
            if (!isNaN(startDurationInMinutes)) {
                waterSettings.manualInfo.lastEnableTime = moment().valueOf();
                if (startDurationInMinutes == -1) {
                    waterSettings.manualInfo.duration = null;
                } else {
                    waterSettings.manualInfo.duration = moment.duration(startDurationInMinutes, "minutes").asMilliseconds();
                }

                updateWaterState();
                ctx.editMessageText(getMessage(`✅ ${gettext('Watering is on')}`), getDefaultKeyboard());
            } else {
                switch (command) {
                    case "back":
                        ctx.editMessageText(getMessage(), getDefaultKeyboard());
                        break;
                    default:
                        ctx.editMessageText(getMessage(`▶️ ${gettext('How much time should the watering be turned on?')}`), this.manualStartKeyboard);
                        break;
                }
            }
        });

        context.configureAction(/water:settings:?([^:]*)/, ctx => { 
            let command = ctx.match[1];

            switch (command) {
                case "back":
                    ctx.editMessageText(getMessage(), getDefaultKeyboard());
                    break;
                case "manual":
                    setManualMode(true);
                    updateWaterState();
                    ctx.editMessageText(getMessage(`✅ ${gettext('Manual mode is set')}`), getDefaultKeyboard());
                    break;
                case "auto":
                    setManualMode(false);
                    updateWaterState();
                    ctx.editMessageText(getMessage(`✅ ${gettext('Automatic mode is set')}`), getDefaultKeyboard());
                    break;
                default:
                    ctx.editMessageText(getMessage(`▶️ ${gettext('Choose a setting')}`), this.settingsKeyboard);
                    break;
            }
        });

        context.configureAction(/water:stop/, ctx => { 
            if (!waterSettings.isManualMode) {
                setManualMode(true);
                updateWaterState();
                ctx.editMessageText(getMessage(`✅ ${gettext('Watering is turned off and reset into manual mode')}`), getDefaultKeyboard());
            } else {
                waterSettings.manualInfo.lastEnableTime = null;
                waterSettings.manualInfo.duration = null;
                updateWaterState();
                ctx.editMessageText(getMessage(`✅ ${gettext('Watering is turned off')}`), getDefaultKeyboard());
            }
        });

        updateWaterState();
        setInterval(updateWaterState, 1000 * 10); // Update state every 10 sec
    }
}