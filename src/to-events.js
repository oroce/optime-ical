const crypto = require('crypto');
const dateFns = require('date-fns');
const cheerio = require('cheerio');
const config = require('./config');
const { zonedTimeToUtc } = require('date-fns-tz');
module.exports = (body) => {
    const $ = cheerio.load(body);
    const els = $('.admTartTblRek tr').get();
    return els
        .map((el, i) => {
            if (i === 0) {
                return;
            }

            const cols = $(el).find('td');
            const date = $(cols[0]).text().replace(/\\n/gm, '').trim();
            const time = $(cols[1]).text().replace(/\\n/gm, '').trim();
            const training = $(cols[2]).text().replace(/\\n/gm, '').trim();
            const room = $(cols[3]).text().replace(/\\n/gm, '').trim();
            return {
                date, time, training, room
            };
        })
        .filter(row => row != null)
        .map(row => {
            const date = dateFns.parse(row.date.match(/(\d{4}\.\d{1,2}\.\d{1,2}\.)/)[0], 'yyyy.MM.dd.', new Date());
            const timeSlots = row.time.split(' - ');
            const start = zonedTimeToUtc(dateFns.parse(timeSlots[0], 'H:m', date), 'Europe/Budapest');
            const end = zonedTimeToUtc(dateFns.parse(timeSlots[1], 'H:m', date), 'Europe/Budapest');
            const shasum = crypto.createHash('sha1');
            shasum.update(config.username);
            shasum.update(start.toJSON());
            shasum.update(end.toJSON());
            shasum.update(row.training);
            shasum.update(row.room);
            const id = shasum.digest('hex');

            return {
                ...config.eventFields,
                id,
                start,
                end,
                summary: `${row.training} (${row.room})`
            }
        });
}