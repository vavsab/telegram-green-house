import { databaseController } from '../databaseController';
import * as moment from 'moment';
import * as fs from 'fs';
import * as path from 'path';
import * as webshot from 'webshot';
import { IBotModule, InitializeContext } from './bot-module'
import * as resources from "../resources";
import { gettext } from '../gettext';

export class Chart implements IBotModule {
    initializeMenu(addKeyboardItem: any): void {
        addKeyboardItem({ id: 'chart', button: `〽️ ${gettext('Chart')}`, regex: new RegExp(gettext('Chart')), row: 0, isEnabled: true });
    }    
    
    initialize(context: InitializeContext): void {
        context.configureAnswerFor('chart', (ctx) => {
            let statusMessageId = null
            
            context.botApp.telegram.sendMessage(ctx.chat.id, `⏳ ${gettext('Creating chart...')}`)
            .then(result => result.message_id)
            .then(messageId => {
                statusMessageId = messageId;
    
                return databaseController.run(async db => {
                    const filterDate = new Date().getTime() - 1000 * 60 * 60 * 24;
                    return await db.collection('data').find({date: { $gt: new Date(filterDate)}}).toArray(); 
                })
                .then((sensorData) => {
                    return new Promise((resolve, reject) => {
                        const fileName = 'chart.png';
                        const address = resources.getFilePath('chart.html');
                        const maxNumberOfPoints = 15;
                        let step = Math.trunc(sensorData.length / maxNumberOfPoints);
                        if (step == 0){
                            step = 1; // minimal step
                        } 
    
                        let temperatureData = [];
                        let dates = [];
                        let i = 0;
                        while (i < sensorData.length) {
                            let sensor = sensorData[i];
                            temperatureData.push(sensor.temperature.toFixed(1));
                            let momentDate = moment(sensor.date);
                            dates.push(`"${momentDate.format('DD')}/${momentDate.format('H:mm')}"`);
                            i += step;
                        }
                        
                        let datesString = `labels: [${dates.join(',')}],`;
                        let dataString = `data: [${temperatureData.join(',')}],`;
    
                        fs.readFile(address, 'utf8', (err, data) => {
                            if (err) {
                                reject(err);
                            } else {
                                data = data.replace(/\/\/ LabelsStart(.|\n|\r)*LabelsEnd/, datesString);
                                data = data.replace(/\/\/ DataStart(.|\n|\r)*DataEnd/, dataString);
                                data = data.replace(/\/\/label\/\//, gettext('Temperature (°C on day/hour:minute)'));
                                
                                webshot(data, fileName, {siteType:'html', renderDelay: 500, shotSize: { width: 1050, height: 550 }}, err => {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        ctx.replyWithPhoto({ source: fileName })
                                        .then(() => resolve(), reason => reject(reason));
                                    }
                                });
                            }
                        });
                    })
                });
            })
            .then(() => {
                context.botApp.telegram.deleteMessage(ctx.chat.id, statusMessageId);
            });
        });
    }
}