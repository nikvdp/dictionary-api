#!/usr/bin/env node
'use strict';
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

module.exports.importDictionary = importDictionary;

if (require.main === module) {
  var dictPath = process.argv[2];

  if (dictPath) {
    importDictionary(dictPath);
  }
}

function importDictionary(dictPath) {
  dictionaryToXml(dictPath)
    .then(function(f) {
      console.log('Wrote xml file to [%s]!', f);
      return f;
    })
    .then(convertDictFromXml)
    .then(function(f) {
      console.log('Wrote json file to [%s]!', f);
    });
}

/**
 * Uses `dedict` utility from https://josephg.com/blog/apple-dictionaries-part-2/ to
 * do the heavy lifting of zlib extracting the xml chunks from the actual .dictionary
 * file and output it to an "xml" file. I say "xml" in scarequotes, because it's a list
 * of small xml documents, one line representing one dictionary entry
 *
 * @param dictionary
 * @returns {Promise}
 */
function dictionaryToXml(dictionary) {
  var outputPath = path.join(__dirname, 'dicts', path.basename(dictionary).replace(/\.dictionary$/i, '.xml'));
  var outFile = fs.createWriteStream(outputPath);
  // TODO: redo this with node streams instead of shell pipes
  var dedict = spawn('./bin/dedict', [dictionary]);
  var strip = spawn('./bin/strip', []);

  dedict.stdout.on('data', (data) => {
    strip.stdin.write(data);
  });

  strip.stdout.on('data', (data) => {
    // console.log('data: ', data);
    outFile.write(data);
  });
  dedict.on('close', (code) => {
    strip.stdin.end();
  });

  return new Promise(function(resolve, reject) {
    strip.on('close', (code) => {
      // console.log(`strip process exited with code ${code}`);
      resolve(outputPath);
    });
  });
}

/**
 * Rely on cheerio to read in an "xml" file generated by `dictionaryToXml()`.
 * Read through it line by line, and add each entry into one big JSON object, which
 * we then write to disk in the ./dicts folder
 *
 * @param dictPath
 * @returns {Promise}
 */
function convertDictFromXml(dictPath) {
  var output = {};
  var readline = require('readline').createInterface({
    input: fs.createReadStream(dictPath)
  });

  var lineCount = 0;
  readline.on('line', function(line) {
    var json = dictEntryToJson(line);
    // our final json should be key-ed by word title
    output[json.word] = json;
    lineCount++;
  });

  return new Promise((resolve, reject) => {
    readline.on('close', function () {
      var outputFile = dictPath.replace(/\.xml$/i, '.json');
      // console.log('Done! Writing to: ', outputFile);
      fs.writeFileSync(outputFile, JSON.stringify(output));
      resolve(outputFile);
    });
  });
}

/**
 * Build a readable json structure for the given entry
 * @param entryString
 * @returns {{}}
 */
function dictEntryToJson(entryString) {
  var $entry = cheerio.load(entryString, {xmlMode: true});

  var jsonMap = {
    word: getWord,
    syllables: getSyllables,
    definitions: getDefinitions,
    pos: getPOS,
    synonyms: getSynonyms,
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

// this function is only used for testing
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

/**
 * Extract the array of syllables from an Apple dictionary entry
 *
 * @param $entry - an already initialized cheerio object
 * @returns {*}
 */
function getSyllables($entry) {
  var results = [];
  $entry('.hw').each(function(en) {
    var syllables = ($entry(this).attr('syllabified'))
    if (syllables) {
      results.push(syllables.trim());
    }
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

/**
 * For thesaurus entries, use cheerio to extract the various
 * synonyn groups. Return an array of arrays to represent the
 * synonym grouping used in Apple's dictionary entry format
 * @param $entry - an already initialized cheerio object
 * @returns {*}
 */
function getSynonyms($entry) {
  var results = [];
  $entry('.synList .synGroup' ).each(function(en) {
    var synGroup = [];
    $entry(this).find('.syn').each(function(syn) {
      synGroup.push($entry(this).text().trim());
    });
    results.push(synGroup);
  });
  return results.length > 0 ? results : null;
}

/**
 * Genericized method to use cheerio to specify a selector, and
 * return a trimmed array of the matches
 *
 * @param $entry - an already initialized cheerio object
 * @param selector
 * @returns {*}
 */
function getAsArr($entry, selector) {
  var results = [];
  $entry(selector).each(function(example) {
    var txt = $entry(this).text();
    results.push(txt ? txt.trim() : txt);
  });
  return results.length > 0 ? results : null;
}

