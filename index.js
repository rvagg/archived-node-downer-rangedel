var path      = require('path')
  , used      = false

// path to the native module
module.exports.location = path.join(__dirname, '/build/Release/rangedel.node')
// register the plugin
module.exports.use = function () {
  if (used) return
  used = true
  require('leveldown')._registerPlugin(module.exports.location)
}