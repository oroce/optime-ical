const ical = require('ical-generator');
module.exports = (events) => {
  const calendar = ical({
    domain: 'optime.oroszi.net',
    name: 'Optime',
    prodId: '//oroszi.net//optime-ical-generator//EN',
    timezone: 'UTC',
    ttl: 60 * 5,
    events
  });
  return calendar._generate();
};
