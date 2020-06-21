export class AppConfiguration {
    public webPanel: WebPanelConfiguration;

    public webEmulator: WebEmulatorConfiguration;

    public bot: BotConfiguration;

    public language: string;

    public downDetector: DownDetectorConfiguration;
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

    public weatherLink: string;

    public switchOnLightsTimeRange: string;

    public grantAccessForAllUsers: boolean;

    public modules: BotModules;

    public windowAddresses: number[];

    public watering: WateringConfiguration;
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

export class WateringConfiguration {
    public valves: WateringValveConfiguration[];
}

export class WateringValveConfiguration {
    public id: number;

    public name: string;

    public pin: number;
}

export class DownDetectorConfiguration {
    public endpoint: string;
    
    public id: string;

    public pingIntervalMs: number;
}

