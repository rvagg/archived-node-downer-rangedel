var leveldown = require('leveldown')
  , loc       = __dirname + '/build/Release/obj.target/rangedel.node'

leveldown._registerPlugin(loc)
return

console.log('opening database...')
var db = leveldown('/tmp/tmp.db')
  , sourceData = (function () {
      var d = []
        , i = 0
        , k
      for (; i < 100; i++) {
        k = (i < 10 ? '0' : '') + i
        d.push({
            type  : 'put'
          , key   : k
          , value : Math.random()
        })
      }
      return d
    }())

  , contents = function (callback) {
      console.log('contents:')
      var it = db.iterator()
      function n () {
        it.next(function (err, k, v) {
          if (err)
            throw err
          if (!arguments.length)
            return callback && callback()
          console.log('key:'+ k.toString(), 'value:' + v.toString())
          n()
        })
      }
      n()
    }

console.log('rangedel on db obj =', db.rangeDel)


db.open(function (err) {
  if (err)
    throw err

  db.batch(sourceData, function (err) {
    if (err)
      throw err

    contents(function () {
      db.rangeDel(function (err) {
        if (err)
          throw err
        contents()
      })
    })
  })
})