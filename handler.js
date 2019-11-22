'use strict';
const got = require('got');
const cheerio = require('cheerio');
const dateFns = require('date-fns');
const ical = require('ical-generator');
const crypto = require('crypto');
const config = {
  username: process.env.OPTIME_USERNAME,
  password: process.env.OPTIME_PASSWORD,
  eventFields: {
    location: process.env.EVENT_FIELD_LOCATION
  }
};
function error (statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}
async function getEvents () {
  if (!config.username || !config.password) {
    throw error(400, 'USERNAME and PASSWORD are mandatory');
  }

  const response = await got('https://secure.myoptime.eu/fit/login', {
    method: 'POST',
    body: {
      username: config.username,
      password: config.password
    },
    form: true,
    rejectUnauthorized: false
  });
  const matches = response.body.match(/href="timetable\?session=(.*)">HELYF/);
  if (matches == null) {
    throw error(404, 'No token like html were found in the response (wrong credentials maybe?)');
  }

  const token = matches[1];
  if (!token) {
    throw error(404, 'Token was not in the html');
  }
  const date20DaysAgo = dateFns.subDays(new Date(), 20);
  const fromYear = dateFns.format(date20DaysAgo, 'yyyy');
  const fromMonth = dateFns.format(date20DaysAgo, 'MM');
  const fromDay = dateFns.format(date20DaysAgo, 'dd');

  const applications = await got('https://secure.myoptime.eu/fit/applications', {
    query: {
      session: token
    },
    body: {
      tolev: fromYear,
      tolho: fromMonth,
      tolnap: fromDay,
      igev: '',
      igho: '',
      ignap: '',
      keres_edzes: '',
      keres_barat: '',
      lap: 1,
      dbperlap: 30
    },
    form: true,
    rejectUnauthorized: false
  });
  const $ = cheerio.load(applications.body);

  const courses = $('.admTartTblRek tr').get()
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
      const start = dateFns.parse(timeSlots[0], 'H:m', date);
      const end = dateFns.parse(timeSlots[1], 'H:m', date);
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
      };
    });

  return courses;
}

module.exports.ical = async (event) => {
  try {
    const events = await getEvents();
    const calendar = ical({
      domain: 'optime.oroszi.net',
      name: 'Optime',
      prodId: '//oroszi.net.com//optime-ical-generator//EN',
      ttl: 60 * 5,
      events
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.ics"'
      },
      body: calendar._generate()
    };
  } catch (ex) {
    return {
      statusCode: ex.statusCode || 500,
      body: ex.message,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      }
    };
  }
};

module.exports.json = async (event) => {
  try {
    const events = await getEvents();
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(events, null, 2)
    };
  } catch (ex) {
    return {
      statusCode: ex.statusCode || 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: ex.message
      })
    };
  }
};
