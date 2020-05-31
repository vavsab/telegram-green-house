import { AppConfiguration } from "../app-configuration";
import { IGreenHouse } from "../green-house/green-house";
import { TelegrafContext } from "telegraf/typings/context";
import { HearsTriggers } from "telegraf/typings/composer";

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

    public configureAction: (trigger: HearsTriggers<TelegrafContext>, answerCallback: (ctx: TelegrafContext) => void) => void;

    public botApp: any;

    public config: AppConfiguration;

    public allowedChatIds: any;

    public adminChatId: number;

    public eventEmitter: any;

    public greenHouse: IGreenHouse;
}