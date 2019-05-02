const fs = require('fs'),
request = require('request'),
express = require('express'),
path = require('path'),
urlPattern = require('url-pattern'),
loki = require('lokijs'),
http = require('http'),
https = require('https');

var app = express();
