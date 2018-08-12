export interface IGreenHouse {
    readonly isEmulator: boolean;

    getSensorsData(): Promise<SensorsData>;

    setWaterValve(isOpen: boolean): void;

    setLights(isSwitchedOn: boolean): void;

    takePhoto(): Promise<string>;

    recordVideo(seconds: number): Promise<string>;

    sendWindowCommand(command: WindowCommand): void;
}

export class SensorsData {
    public temperature: number;

    public humidity: number;
}

export class WindowCommand {
    public address: number;

    public command: string;

    constructor(address: number, command: string) {
        this.address = address;
        this.command = command;
    }

    public toSerialCommand(): string {
        return `${this.address}#${this.command}\n`;
    }
}