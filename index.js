var leveldown = require('leveldown')
  , path      = require('path')
  , loc       = path.join(__dirname, '/build/Release/rangedel.node')

leveldown._registerPlugin(loc)