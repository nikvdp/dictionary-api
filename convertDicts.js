#!/usr/bin/env node
'use strict';
var cheerio = require('cheerio');
var fs = require('fs');
var path = require('path');
var spawn = require('child_process').spawn;

// convertDictFromXml('./dict.xml');

var dictPath = '/Library/Dictionaries/Oxford Thesaurus of English.dictionary';
dictPath = '/Library/Dictionaries/New Oxford American Dictionary.dictionary';

dictionaryToXml(dictPath)
  .then(function(f) {
    console.log('Wrote xml file to [%s]!', f);
    return f;
  })
  .then(convertDictFromXml)
  .then(function(f) {
    console.log('Wrote json file to [%s]!', f);
  });

// var entry = '<d:entry xmlns:d="http://www.apple.com/DTDs/DictionaryService-1.0.rng" id="t_en_gb0000001" d:title="aback" class="entry"><span class="hg"><span role="text" class="hw">aback</span><span class="gp tg_hg"> </span></span><span class="sg"><span class="se1"><span class="gp tg_se1">▶</span><span role="text" class="posg"><span class="pos"><span class="gp tg_pos">adverb</span></span><span class="gp tg_posg"> </span></span><span class="subEntryBlock t_phrases"><span class="gp ty_label tg_subEntryBlock">PHRASES </span><span id="t_en_gb0000001.002" class="subEnt"> <span role="text" class="l">take someone aback </span><span id="t_en_gb0000001.001" class="msThes t_core"><span class="eg"><span class="ex">Joanna was taken aback by the violence of his reaction</span><span class="gp tg_eg">: </span></span><span class="synList"><span class="synGroup"><span class="syn t_core">surprise<span class="gp tg_syn">, </span></span><span class="syn">shock<span class="gp tg_syn">, </span></span><span class="syn">stun<span class="gp tg_syn">, </span></span><span class="syn">stagger<span class="gp tg_syn">, </span></span><span class="syn">astound<span class="gp tg_syn">, </span></span><span class="syn">astonish<span class="gp tg_syn">, </span></span><span class="syn">startle<span class="gp tg_syn">, </span></span><span class="syn">take by surprise</span><span class="gp tg_synGroup">; </span></span><span class="synGroup"><span class="syn">dumbfound<span class="gp tg_syn">, </span></span><span class="syn">daze<span class="gp tg_syn">, </span></span><span class="syn">nonplus<span class="gp tg_syn">, </span></span><span class="syn">stop someone in their tracks<span class="gp tg_syn">, </span></span><span class="syn">stupefy<span class="gp tg_syn">, </span></span><span class="syn">take someone\'s breath away</span><span class="gp tg_synGroup">; </span></span><span class="synGroup"><span class="syn">shake (up)<span class="gp tg_syn">, </span></span><span class="syn">jolt<span class="gp tg_syn">, </span></span><span class="syn">throw<span class="gp tg_syn">, </span></span><span class="syn">unnerve<span class="gp tg_syn">, </span></span><span class="syn">disconcert<span class="gp tg_syn">, </span></span><span class="syn">disturb<span class="gp tg_syn">, </span></span><span class="syn">disquiet<span class="gp tg_syn">, </span></span><span class="syn">unsettle<span class="gp tg_syn">, </span></span><span class="syn">discompose<span class="gp tg_syn">, </span></span><span class="syn">bewilder</span><span class="gp tg_synGroup">; </span></span><span class="synGroup"><span class="lg"><span class="reg"> informal </span><span class="gp tg_lg"> </span></span><span class="syn">flabbergast<span class="gp tg_syn">, </span></span><span class="syn">knock for six<span class="gp tg_syn">, </span></span><span class="syn">knock sideways<span class="gp tg_syn">, </span></span><span class="syn">knock out<span class="gp tg_syn">, </span></span><span class="syn">floor<span class="gp tg_syn">, </span></span><span class="syn">strike dumb</span><span class="gp tg_synGroup">.</span></span></span></span></span></span></span></span></d:entry>';
// console.log(dictEntryToJson(entry));

function dictionaryToXml(dictionary) {
  var outputPath = path.join(__dirname, 'dicts', path.basename(dictionary).replace(/\.dictionary$/i, '.xml'));
  var output = fs.createWriteStream(outputPath);
  // TODO: redo this with node streams instead of shell pipes
  var dedict = spawn('./bin/dedict', [dictionary]);
  var strip = spawn('./bin/strip', []);

  dedict.stdout.on('data', (data) => {
    strip.stdin.write(data);
  });

  strip.stdout.on('data', (data) => {
    // console.log('data: ', data);
    output.write(data);
  });
  //
  // dedict.stderr.on('data', (data) => {
  //   console.log(`stderr: ${data}`);
  // });
  //
  dedict.on('close', (code) => {
    // console.log(`dedict process exited with code ${code}`);
    strip.stdin.end();
  });

  return new Promise(function(resolve, reject) {
    strip.on('close', (code) => {
      // console.log(`strip process exited with code ${code}`);
      resolve(outputPath);
    });
  });
}

function convertDictFromXml(dictPath) {
  var output = {};
  var readline = require('readline').createInterface({
    input: fs.createReadStream(dictPath)
  });

  var lineCount = 0;
  readline.on('line', function(line) {
    var json = dictEntryToJson(line);
    output[json.word] = json;
    // console.log('Storing line ', lineCount);
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

function getAsArr($entry, selector) {
  var results = [];
  $entry(selector).each(function(example) {
    var txt = $entry(this).text();
    results.push(txt ? txt.trim() : txt);
  });
  return results.length > 0 ? results : null;
}

module.exports.convertDictFromXml = convertDictFromXml;
