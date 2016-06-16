#!/usr/bin/env node
var cheerio = require('cheerio');
var fs = require('fs');

var output = {};
// debug toggle
if (false) {
  var entryString = fs.readFileSync('entry.xml', 'utf-8');
  // printEntry(entryString);
} else {
  var readline = require('readline').createInterface({
    input: fs.createReadStream('dict.xml')
    // input: fs.createReadStream('entry.xml')
  });

  var lineCount = 0;
  readline.on('line', function(line) {
    var json = dictEntryToJson(line);
    output[json.word] = json;
    // console.log('Storing line ', lineCount);
    lineCount++;
  });
  
  readline.on('close', function() {
    var outputFile = './dict.json';
    console.log('Done! Writing to: ', outputFile);
    fs.writeFileSync(outputFile, JSON.stringify(output));
  })
}

function printJson(entryString) {
  console.log(JSON.stringify(dictEntryToJson(entryString), '', 2));
}

function dictEntryToJson(entryString) {
  var $entry = cheerio.load(entryString, {xmlMode: true});

  var jsonMap = {
    word: getWord,
    syllables: getSyllables,
    definitions: getDefinitions,
    pos: getPOS,
    examples: getExamples
  };

  var res = {};
  Object.keys(jsonMap).forEach(function(key) {
    var val = jsonMap[key]($entry);
    if (val) {
      res[key] = val;
    }
  });

  return res;
}

function printEntry(entryString) {
  var $entry = cheerio.load(entryString, {xmlMode: true});

  console.log('---------------------');
  console.log('Word: ' + getWord($entry));
  console.log('syllables: ', getSyllables($entry));
  console.log('Definition: \n' + getDefinitions($entry).map(function (d) {
        return '- ' + d
      }).join('\n'));
  console.log('POS: ', getPOS($entry).join(" / "));
  console.log('Examples: \n' + getExamples($entry).map(function (d) {
        return '- ' + d
      }).join('\n'));
  console.log('---------------------');

}

function getWord($entry) {
  return $entry('.hw').text().trim();
}

function getSyllables($entry) {
  var results = [];
  $entry('.hw').each(function(en) {
    results.push($entry(this).attr('syllabified'));
  });
  results = results
    .map(function(r) {
      return r ? r.split('·') : null;
    })
    // clean out empty strings
    .filter(function(r) {
      return !!r;
    });
  return results.length > 0 ? results : null;
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

function getAsArr($entry, selector) {
  var results = [];
  $entry(selector).each(function(example) {
    var txt = $entry(this).text();
    results.push(txt ? txt.trim() : txt);
  });
  return results.length > 0 ? results : null;
}
