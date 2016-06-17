#!/usr/bin/env node
'use strict';
var http = require('http');
var express = require('express');
var router = express.Router();
var fs = require('fs');
var path = require('path');
var dictionaryLoader = require('./convertDicts');

const appName = 'dictionary-api';
const port = 5000;
var app = express();
var server = http.createServer(app);

var dictionaryConfig;

main();

function main() {
  getDictionaryConfig()
    .then((dictConfig) => {
      return dictionaryConfig = dictConfig;
    })
    .then(loadDictionaries)
    .then(initializeServer);
}

// var dictionaryConfig = getDictionaryConfig();
// console.log(JSON.stringify(dictionaryConfig, '', 2));


function loadDictionaries(dictConfig) {
  return new Promise((resolve) => {

  Object.keys(dictConfig)
    .forEach((dict) => {
      process.stdout.write('Loading dictionary [' + dict + ']... ');
      dictConfig[dict].data = require(dictConfig[dict].path);
      process.stdout.write(' DONE!\n');
      resolve();
    });
  });
}

function getDictionaryConfig() {
  var dictConfig = {};
  var dictList = fs
    .readdirSync('./dicts')
    .filter((f) => {return f.match(/\.json$/i)})
    .forEach((dict) => {
      var dictName = dict.replace(/(.*\/)?(.*)\.json$/i, (str, $1, $2) => { return $2});
      dictConfig[dictName] = {};
      // for now just determine which ones are thesauri based on filename
      dictConfig[dictName].path = path.resolve(path.join('.', 'dicts', dict));
      if (dict.match(/thesaurus/i)) {
        dictConfig[dictName].thesaurus = true;
      }
    });
  // TODO: use q or bluebird so that we can just do q.when instead of writing a resolve
  return new Promise((resolve) => {resolve(dictConfig)});
}

function initializeServer() {
  app.use('/', declareRoutes());

  app.set('port', port);

  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
}

function declareRoutes() {
  var router = express.Router();
  var baseStructure = {
    url: "/",
    resources: {
      dictionaries: {
        url: "/dictionaries"
      },
      thesauri: {
        url: "/thesauri"
      },
      // definitions: {
      //   url: "/definitions"
      // },
      // synonyms: {
      //   url: "/synonyms"
      // }
    }
  };

  router.get('/', (req, res, next) => {
    // lay out the url structure of the API
    res.json(baseStructure);
  });

  router.get('/dictionaries', (req, res, next) => {
    res.json(Object.keys(dictionaryConfig));
  });

  router.get('/dictionaries/:dict/:word', (req, res, next) => {
    var dict = req.params.dict;
    var word = req.params.word;
    console.log('Returning [%s] from [%s]', word, dict);
    var dictData = dictionaryConfig[dict].data;
    res.json(dictData[word]);
  });

  router.get('/thesauri', (req, res, next) => {
    var thesauri = Object.keys(dictionaryConfig)
      .filter((dict) => {
        return dictionaryConfig[dict].thesaurus;
      });

    res.json(thesauri);
    next();
  });

  router.get('/thesauri/:dict/:word', (req, res, next) => {
    var dict = req.params.dict;
    var word = req.params.word;
    console.log('Returning [%s] from [%s]', word, dict);
    if (! dictionaryConfig[dict].thesaurus) {
      res.status(500).json({error: 'Dictionary ' + dict + ' is not a thesaurus!'});
      next();
    } else {
      var dictData = dictionaryConfig[dict].data;
      res.json(dictData[word]);
    }
  });

  return router;
}


// server event handlers
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  //debug('Listening on ' + bind);
  console.log(appName + ' listening on ' + bind);
}
