#!/usr/bin/env node
var cheerio = require('cheerio');
var fs = require('fs');

// debug toggle
if (false) {
  var entryString = fs.readFileSync('entry.xml', 'utf-8');
  printEntry(entryString);
} else {
  var readline = require('readline').createInterface({
    input: fs.createReadStream('dict.xml')
  });

  readline.on('line', printEntry);
}



function printEntry(entryString) {
  var $entry = cheerio.load(entryString, {xmlMode: true});

  console.log('---------------------');
  console.log('Word: ' + getWord($entry));
  console.log('syllables: ', getSyllables($entry));
  console.log('Definition: \n' + getDefinitions($entry).map(function(d){return '- ' + d}).join('\n'));
  console.log('POS: ', getPOS($entry).join(" / "));
  console.log('Examples: \n' + getExamples($entry).map(function(d){return '- ' + d}).join('\n'));
  console.log('---------------------');

  function getWord($entry) {
    return $entry('.hw').text();
  }

  function getSyllables($entry) {
    var results = [];
    $entry('.hw').each(function(en) {
      results.push($entry(this).attr('syllabified'));
    });
    return results.map(function(r) {
      return r ? r.split('·') : '';
    });
  }

  function getDefinitions($entry) {
    return getAsArr($entry, '.df');
  }

  function getPOS($entry) {
    return getAsArr($entry, '.tg_pos');
  }

  function getExamples($entry) {
    return getAsArr($entry, '.eg');
  }


  function getExamples($entry) {
    return getAsArr($entry, '.eg');
  }

  function getAsArr($entry, selector) {
    var results = [];
    $entry(selector).each(function(example) {
      results.push($entry(this).text());
    });
    return results;
  }

}
