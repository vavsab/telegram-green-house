import { AppConfiguration } from "../app-configuration";
import { IGreenHouse } from "../green-house/green-house";
import { TelegrafContext } from "telegraf/typings/context";
import { HearsTriggers } from "telegraf/typings/composer";
import { DbConfigManager } from "../green-house/db-config/db-config-manager";
import { SensorsSource } from "../sensor/sensors-source";
import Telegraf from "telegraf";

export interface IBotContext extends TelegrafContext {
    session?:  IBotSession;
}

export interface IBotSession {
    lock?: string;
}

export interface ISessionActionHandler {
    sessionLock: RegExp;

    answerCallback: (ctx: IBotContext, release: () => Promise<void>) => Promise<void>;
}

export interface IKeyboardItem {
    isEnabled: boolean;

    regex: RegExp;

    id: string;

    button: string;

    row?: number;

    order?: number;
}

export interface IBotModule {
    initializeMenu(addKeyboardItem: (item: IKeyboardItem) => void): void;

    initialize(context: InitializeContext): void;
}

export class InitializeContext {
    public configureAnswerFor: (id: string, answerCallback: (ctx: TelegrafContext) => void) => void;

    public configureAction: (trigger: HearsTriggers<TelegrafContext>, answerCallback: (ctx: IBotContext) => Promise<void>) => void;

    public configureSessionAction: (sessionLock: RegExp,  answerCallback: (ctx: IBotContext, release: () => Promise<void>) => Promise<void>) => void;

    public botApp: Telegraf<TelegrafContext>;

    public config: AppConfiguration;

    public allowedChatIds: any;

    public adminChatId: number;

    public sensorsSource: SensorsSource;

    public greenHouse: IGreenHouse;

    public dbConfig: DbConfigManager;
}