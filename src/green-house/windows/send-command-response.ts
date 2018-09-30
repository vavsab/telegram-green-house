import { WindowState } from "./window-state";

export class SendCommmandResponse {
    public state: WindowState;

    public errorCode: number;

    public errorText: string;

    public static createDetailed(state: WindowState, errorCode: number, errorText: string): SendCommmandResponse {
        return { state: state, errorCode: errorCode, errorText: errorText };
    }

    public static create(state: WindowState): SendCommmandResponse {
        return { state: state, errorCode: null, errorText: null };
    }
}