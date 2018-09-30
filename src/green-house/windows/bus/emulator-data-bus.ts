import { DataBus } from "./data-bus";

export class EmulatorDataBus extends DataBus {

    protected async processCommand(command: string): Promise<string> {
        console.log(`EmulatorDataBus > ${command}`);

        let statuses: string[] = ['open', 'closed', 'closing', 'opening', 'error#9#Opening timeout. Up limit has not been enabled', ''];

        await new Promise(resolve => setTimeout(resolve, 300));

        return await Promise.resolve(statuses[parseInt((Math.random() * 10000 % statuses.length).toString())]);
    }

}