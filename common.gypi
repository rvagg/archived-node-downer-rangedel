{
    "variables"  : {
        "leveldown"  : "<!(node -p -e \"require('path').dirname(require.resolve('leveldown'))\")"
      , "ldbversion" : "<!(node -p -e \"require('fs').readFileSync(require('path').dirname(require.resolve('leveldown')) + '/deps/leveldb/leveldb.gyp').toString().match(/ldbversion.*:.*(\d\.\d\.\d)./)[1]\")"
      , "leveldown_include_dirs": [
            "<(leveldown)/src/"
          , "<(leveldown)/deps/leveldb/leveldb-<(ldbversion)/include/"
        ]
      , "conditions" : [
          [ "OS == 'win'", {
              "leveldown_libraries": [
                  "<(leveldown)/build/$(Configuration)/leveldown.lib"
              ]
            }, {
              "leveldown_libraries": [
                  "<(leveldown)/build/$(BUILDTYPE)/leveldown.node"
                , "-Wl,-rpath,<(leveldown)/build/$(BUILDTYPE)"
              ]
          }]
        ]
    }
}