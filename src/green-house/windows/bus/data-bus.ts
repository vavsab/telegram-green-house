export abstract class DataBus {
    private queryPromise: Promise<string> = Promise.resolve('');

    public async sendCommand(command: string):Promise<string> {
        this.queryPromise = this.queryPromise.then(() => this.processCommand(command));

        return await this.queryPromise;
    }

    protected abstract async processCommand(command: string): Promise<string>;
}