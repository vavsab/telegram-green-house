export class AppConfiguration {
    public webPanel: WebPanelConfiguration;

    public webEmulator: WebEmulatorConfiguration;

    public bot: BotConfiguration;
}

export class WebPanelConfiguration {
    public isEnabled: boolean;

    public port: number;

    public title: string;

    public link: string;
}

export class WebEmulatorConfiguration {
    public isEnabled: boolean;

    public port: number;

    public link: string;
}

export class BotConfiguration {
    public token: string;

    public link: string;

    public linkToRepository: string;

    public adminChatId: number;

    public allowedChatIds: number[];

    public enableCamera: boolean;

    public maxTemperature: number;

    public minTemperature: number;

    public weatherLink: string;

    public saveToDbTimeoutInMinutes: number;

    public takePhotoDelayInSeconds: number;

    public intervalBetweenWarningsInMinutes: number;

    public switchOnLightsTimeRange: string;

    public grantAccessForAllUsers: boolean;

    public modules: BotModules;

    public windowAddresses: number[];
}

export class BotModules {
    public sensors: boolean;

    public settings: boolean;

    public chart: boolean;

    public photo: boolean;

    public video: boolean;

    public weather: boolean;

    public water: boolean;
    
    public windows: boolean;
}

