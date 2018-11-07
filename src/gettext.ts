import * as fs from 'fs'
import * as path from 'path'
import * as Gettext from 'node-gettext'
import { po } from 'gettext-parser'
import { getAsbolutePath } from './resources';
 
const translationsDir = './i18n'
const locales = ['ru']
const domain = 'messages'
 
const gt = new Gettext()
 
locales.forEach((locale) => {
    const filename = `${domain}.po`;
    const translationsFilePath = getAsbolutePath(path.join(translationsDir, locale, filename));
    const translationsContent = fs.readFileSync(translationsFilePath);
 
    const parsedTranslations = po.parse(translationsContent)
    gt.addTranslations(locale, domain, parsedTranslations)
})

const gettext: (message: string, context?: string) => string = (message: string, context?: string) => {
    if (context == null) 
        return (<any>gt).gettext.apply(gt, [message]);
        
    return (<any>gt).pgettext.apply(gt, [context, message]);
};

export { gettext, gt as gettextController };