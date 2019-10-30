const ical = require('ical-generator');
module.exports = (events) => {
  const calendar = ical({
    domain: 'optime.oroszi.net',
    name: 'Optime',
    prodId: '//oroszi.net//optime-ical-generator//EN',
    timezone: 'UTC',
    events
  });
  return calendar._generate();
};
