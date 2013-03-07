var used      = false
// path to the native module
module.exports.location = require('bindings')({ path: true, bindings: 'rangedel' })
// register the plugin
module.exports.use = function () {
  if (used) return
  used = true
  require('leveldown')._registerPlugin(module.exports.location)
}