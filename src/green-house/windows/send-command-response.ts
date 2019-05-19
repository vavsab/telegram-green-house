import { WindowState } from "./window-state";

export class SendCommmandResponse {
    public state: WindowState;

    public errorState: WindowState;

    public errorCode: string;

    public static createDetailed(state: WindowState, errorState: WindowState, errorCode: string): SendCommmandResponse {
        return { state: state, errorState: errorState, errorCode: errorCode };
    }

    public static create(state: WindowState): SendCommmandResponse {
        return { state: state, errorState: null, errorCode: null };
    }
}