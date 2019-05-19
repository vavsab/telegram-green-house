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
        let state: WindowState = this.stringToState(stateString);

        switch (state) {
            case WindowState.Error:
                if (responseParts.length != 3)
                    return SendCommmandResponse.create(WindowState.CommunicationError);

                let errorState: WindowState = this.stringToState(responseParts[1]);
                let errorCode: string = responseParts[2];

                return SendCommmandResponse.createDetailed(WindowState.Error, errorState, errorCode);
            default:
                return SendCommmandResponse.create(state);
            
        }
    }

    private stringToState(stateString: string): WindowState {
        switch (stateString) {
            case "open":
                return WindowState.Open;
            case "opening":
                return WindowState.Opening;
            case "closed":
                return WindowState.Closed;
            case "closing":
                return WindowState.Closing;
            case "error":
                return WindowState.Error;
            default:
                return WindowState.CommunicationError;
        }
    }
}