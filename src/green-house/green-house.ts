import { WindowsManager } from "./windows/windows-manager";

export interface IGreenHouse {
    readonly isEmulator: boolean;

    getSensorsData(): Promise<SensorsData>;

    setWaterValve(valveId: number, isOpen: boolean): void;

    setLights(isSwitchedOn: boolean): void;

    takePhoto(): Promise<string>;

    recordVideo(seconds: number): Promise<string>;

    getWindowsManager(): WindowsManager;
}

export class SensorsData {
    public temperature: number;

    public humidity: number;
}