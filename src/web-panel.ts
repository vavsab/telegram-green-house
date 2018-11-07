import * as express from 'express';
import * as events from 'events';
import { AppConfiguration } from './app-configuration';
import { SensorsData } from './green-house/green-house';
import * as socket from 'socket.io';
import * as resources from './resources';
import { createServer } from 'http';
import { gettext } from './gettext';

export class WebPanel {
    private _latestResult: SensorsData = {
        temperature: undefined, 
        humidity: undefined
    };

    public start(config: AppConfiguration, eventEmitter: events): void {        
        eventEmitter.on('sensorData', (data) => {
            this._latestResult = data;
            io.emit('sensorData', data);
        });
        
        let app = express();
        let apiRouter = express.Router();;
        let http = createServer(app);
        let io = socket.listen(http);
        
        app.use(express.static(resources.getFilePath('web-panel')));
        app.use('/api', apiRouter);
        
        let allClients = [];
        io.sockets.on('connection', (socket) => {
           allClients.push(socket);
           var socketInfo = `Soket > Id: ${socket.id}, time: ${(new Date).toLocaleTimeString()}`;
           console.log(`web-panel socket > Connect ${socketInfo}`);
        
           socket.on('disconnect', () => {
              console.log(`web-panel socket > Disconnect: ${socketInfo}`);
        
              let i = allClients.indexOf(socket);
              allClients.splice(i, 1);
           });
        });
        
        apiRouter.get('/config', (req, res) => { 
            res.json({ 
                title: config.webPanel.title,
                link: config.webPanel.link,
                linkToRepository: config.bot.linkToRepository,
                lang: {
                    temperature: gettext('Temperature'),
                    humidity: gettext('Humidity'),
                    lastUpdate: gettext('Last update')
                }
            });
        });
        
        apiRouter.get('/data', (req, res) => {
            res.json(this._latestResult);
        });
        
        http.listen(config.webPanel.port, () => {
            console.log(`web-panel is listening on port ${config.webPanel.port}!`);
        });
    }
}