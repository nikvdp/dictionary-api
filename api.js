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

main();


function main() {
  getDictionaryConfig()
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
  app.use('/', router);

  router.get('/', (req, res, next) => {
    res.send(appName);
  });

  app.set('port', port);

  server.listen(port);
  server.on('error', onError);
  server.on('listening', onListening);
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
