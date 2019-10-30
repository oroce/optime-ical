'use strict';
const got = require('got');
const dateFns = require('date-fns');
const toEvents = require('./src/to-events');
const toIcal = require('./src/to-ical');
const config = require('./src/config');
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

  return toEvents(applications.body);
}

module.exports.ical = async (event) => {
  try {
    const events = await getEvents();
    const calendar = toIcal(events);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.ics"'
      },
      body: calendar
    };
  } catch (ex) {
    return {
      statusCode: ex.statusCode || 500,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="calendar.ics"'
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
