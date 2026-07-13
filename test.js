const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('content/index.html', 'utf8');
const $ = cheerio.load(html);

console.log('Hero class:', $('#hero').attr('class'));
console.log('About class:', $('#about').attr('class'));
console.log('Services class:', $('#services').attr('class'));
console.log('Principles class:', $('#principles').attr('class'));
console.log('---');
console.log('Hero HTML excerpt:', $('#hero').html().substring(0, 200));
