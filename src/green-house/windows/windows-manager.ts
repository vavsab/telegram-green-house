import { DataBus } from "./bus/data-bus";
import { SendCommmandResponse } from "./send-command-response";
import { WindowState } from "./window-state";

export class WindowsManager {
    private readonly _dataBus: DataBus;

    public readonly addresses: number[];

    constructor (addresses: number[], dataBus: DataBus) {
        this.addresses = addresses;
        this._dataBus = dataBus;
    }

    public async sendCommand(address: number, command: string): Promise<SendCommmandResponse> {
        let response: string = await this._dataBus.sendCommand(`${address}#${command}`);

        if (response.trim() == '')
            return SendCommmandResponse.create(WindowState.NotResponding);

        let responseParts: string[] = response.split('#');
        let stateString: string = responseParts[0];

        switch (stateString) {
            case "open":
                return SendCommmandResponse.create(WindowState.Open);
            case "opening":
                return SendCommmandResponse.create(WindowState.Opening);
            case "closed":
                return SendCommmandResponse.create(WindowState.Closed);
            case "closing":
                return SendCommmandResponse.create(WindowState.Closing);
            case "error":
                if (responseParts.length != 3)
                    return SendCommmandResponse.create(WindowState.CommunicationError);

                let errorCode: number = parseInt(responseParts[1]);
                let errorText: string = responseParts[2];

                if (isNaN(errorCode))
                    return SendCommmandResponse.create(WindowState.CommunicationError);

                return SendCommmandResponse.createDetailed(WindowState.Error, errorCode, errorText);
        }

        return SendCommmandResponse.create(WindowState.CommunicationError);
    }
}