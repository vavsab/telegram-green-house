import { AppConfiguration } from "../app-configuration";
import { IGreenHouse } from "../green-house/green-house";

export interface IBotModule {
    initializeMenu(addKeyboardItem: any): void;

    initialize(context: InitializeContext): void;
}

export class InitializeContext {
    public configureAnswerFor: (id:string, answerCallback:any) => void;

    public configureAction: any;

    public botApp: any;

    public config: AppConfiguration;

    public allowedChatIds: any;

    public adminChatId: number;

    public eventEmitter: any;

    public greenHouse: IGreenHouse;
}