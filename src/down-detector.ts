import * as request from 'request';
import { DownDetectorConfiguration } from "./app-configuration";

export class DownDetector {
    private isEnabled = false;

    constructor (private config: DownDetectorConfiguration) {}

    public start() {
        if (this.isEnabled) {
            throw 'Cannot start down detector twice';
        }

        if (this.config 
            && this.config.endpoint 
            && this.config.id
            && this.config.pingIntervalMs) {
            console.log('Down detector is enabled');

            const pingDownDetector = () => {
                request.post(this.config.endpoint, {form: { id: this.config.id }}, err => {
                    if (err) {
                        console.log('DownDetector > Error: ', err);
                    }
                });

                setTimeout(pingDownDetector, this.config.pingIntervalMs);
            };
            
            pingDownDetector();
        } else {
            console.log('Down detector is disabled');
        }

        this.isEnabled = true;
    }
}