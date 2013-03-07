const path      = require('path')
    , fs        = require('fs')
    , rimraf    = require('rimraf')
    , test      = require('tap').test
    , leveldown = require('leveldown')
    , rangedel  = require('./')

var dbidx = 0

    // new database location for each test
  , location = function () {
      return path.join(__dirname, '_leveldown_test_db_' + dbidx++)
    }

    // proper cleanup of any database directories
  , cleanup = function (callback) {
      fs.readdir(__dirname, function (err, list) {
        if (err) return callback(err)

        list = list.filter(function (f) {
          return (/^_leveldown_test_db_/).test(f)
        })

        if (!list.length)
          return callback()

        var ret = 0

        list.forEach(function (f) {
          rimraf(f, function () {
            if (++ret == list.length)
              callback()
          })
        })
      })
    }

    // some source data to play with, keys from 00 to 99 with random data
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

    // utility for testing output matches expected
  , transformSource = function (d) { return { key: +d.key, value: +d.value } }

    // collect entries from the database given an iterator
  , collectEntries = function (db, callback) {
      var iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false })
        , data = []
        , next = function () {
            iterator.next(function (err, key, value) {
              if (err) return callback(err)
              if (!arguments.length) {
                return iterator.end(function (err) {
                  callback(err, data)
                })
              }
              if (key == +key) key = +key
              data.push({ key: key, value: value })
              process.nextTick(next)
            })
          }
      next()
    }

    // this simply wraps around each test function to set up a new database
    // with the sourceData, run the test, close the database and cleanup
  , openclosewrap = function (fn) {
      return function (t) {
        var db
          , end = t.end
        // replace t.end() with our own so we can cleanup then call the real
        // t.end() to finish the test
        t.end = function () {
          db.close(function (err) {
            t.notOk(err, 'close() did not return an error')
            cleanup(end.bind(t))
          })
        }

        cleanup(function (err) {
          t.notOk(err, 'cleanup did not return an error')
          db = leveldown(location())
          db.open(function (err) {
            t.notOk(err, 'open did not return an error')
            db.batch(sourceData, function (err) {
              t.notOk(err, 'open did not return an error')
              fn(db, t)
            })
          })
        })
      }
    }

// note that each test function is wrapped in openclosewrap()

test('test argument-less db#rangeDel() exists', openclosewrap(function (db, t) {
  t.ok(db.rangeDel, 'db.rangeDel exists')
  t.type(db.rangeDel, 'function', 'db.rangeDel() is a function')
  t.end()
}))

test('test argument-less db#rangeDel() throws', openclosewrap(function (db, t) {
  t.throws(db.rangeDel.bind(db), 'no-arg rangeDel() throws')
  t.end()
}))

test('test full delete', openclosewrap(function (db, t) {
  db.rangeDel(function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 0, 'correct number of entries')
          t.deepEqual(data, [])
          t.end()
        }
    )
  })
}))

test('test full delete with reverse=true', openclosewrap(function (db, t) {
  db.rangeDel({ reverse: true }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 0, 'correct number of entries')
          t.deepEqual(data, [])
          t.end()
        }
    )
  })
}))

test('test full delete with start=0', openclosewrap(function (db, t) {
  db.rangeDel({ start: '00' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 0, 'correct number of entries')
          t.deepEqual(data, [])
          t.end()
        }
    )
  })
}))

test('test delete with start=50', openclosewrap(function (db, t) {
  db.rangeDel({ start: '50' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 50, 'correct number of entries')
          var expected = sourceData.slice(0, 50).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with start=50 and reverse=true', openclosewrap(function (db, t) {
  db.rangeDel({ start: '50', reverse: true }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 49, 'correct number of entries')
          var expected = sourceData.slice(51).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with start being a midway key (49.5)', openclosewrap(function (db, t) {
  db.rangeDel({ start: '49.5' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 50, 'correct number of entries')
          var expected = sourceData.slice(0, 50).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with start being a midway key (499999)', openclosewrap(function (db, t) {
  db.rangeDel({ start: '499999' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 50, 'correct number of entries')
          var expected = sourceData.slice(0, 50).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with being a midway key (49.5) and reverse=true', openclosewrap(function (db, t) {
  db.rangeDel({ start: '49.5', reverse: true }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 49, 'correct number of entries')
          var expected = sourceData.slice(51).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))


test('test delete with end=50', openclosewrap(function (db, t) {
  db.rangeDel({ end: '50' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 49, 'correct number of entries')
          var expected = sourceData.slice(51).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with being a midway key (50.5)', openclosewrap(function (db, t) {
  db.rangeDel({ end: '50.5' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 49, 'correct number of entries')
          var expected = sourceData.slice(51).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with being a midway key (50555)', openclosewrap(function (db, t) {
  db.rangeDel({ end: '50555' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 49, 'correct number of entries')
          var expected = sourceData.slice(51).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with being a midway key (50.5) and reverse=true', openclosewrap(function (db, t) {
  db.rangeDel({ end: '50.5', reverse: true }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 51, 'correct number of entries')
          var expected = sourceData.slice(0, 51).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

// end='0', starting key is actually '00' so it should avoid it
test('test delete with end=0 (not "00")', openclosewrap(function (db, t) {
  db.rangeDel({ end: 0 }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 0, 'correct number of entries')
          t.deepEqual(data, [])
          t.end()
        }
    )
  })
}))

test('test delete with start=30 and end=70', openclosewrap(function (db, t) {
  db.rangeDel({ start: '30', end: '70' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 59, 'correct number of entries')
          var expected = sourceData.slice(0, 30).concat(sourceData.slice(71)).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with start=70 and end=30 and reverse=true', openclosewrap(function (db, t) {
  db.rangeDel({ start: '70', end: '30', reverse: true }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 59, 'correct number of entries')
          var expected = sourceData.slice(0, 30).concat(sourceData.slice(71)).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with limit=20', openclosewrap(function (db, t) {
  db.rangeDel({ limit: 20 }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 80, 'correct number of entries')
          var expected = sourceData.slice(20).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with limit=20 and start=20', openclosewrap(function (db, t) {
  db.rangeDel({ limit: 20, start: '20' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 80, 'correct number of entries')
          var expected = sourceData.slice(0, 20).concat(sourceData.slice(40)).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with limit=20 and reverse=true', openclosewrap(function (db, t) {
  db.rangeDel({ limit: 20, reverse: true }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 80, 'correct number of entries')
          var expected = sourceData.slice(0, 80).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with start=79 and limit=20 and reverse=true', openclosewrap(function (db, t) {
  db.rangeDel({ start: '79', limit: 20, reverse: true }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 80, 'correct number of entries')
          var expected = sourceData.slice(0, 60).concat(sourceData.slice(80)).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with end after limit', openclosewrap(function (db, t) {
  db.rangeDel({ limit: 20, end: '40' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 80, 'correct number of entries')
          var expected = sourceData.slice(20).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))

test('test delete with end before limit', openclosewrap(function (db, t) {
  db.rangeDel({ limit: 40, end: '19' }, function (err) {
    t.notOk(err, 'rangeDel did not return an error')
    collectEntries(
        db
      , function (err, data) {
          t.notOk(err, 'no error')
          t.equal(data.length, 80, 'correct number of entries')
          var expected = sourceData.slice(20).map(transformSource)
          t.deepEqual(data, expected)
          t.end()
        }
    )
  })
}))