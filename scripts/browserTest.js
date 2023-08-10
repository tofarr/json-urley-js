
//const path = require('path')
//app.use('/static', express.static(path.join(__dirname, 'public')))


/*
var express = require('express');
var app = express();

//setting middleware
app.use(express.static(__dirname)); //Serves resources from public folder


var server = app.listen(5000);
*/

var http = require('http');
var nStatic = require('node-static');
var fileServer = new nStatic.Server('./');

http.createServer(function (req, res) {
    fileServer.serve(req, res);
}).listen(8080);
