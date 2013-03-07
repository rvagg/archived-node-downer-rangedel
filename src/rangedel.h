/* Copyright (c) 2013 Rod Vagg
 * MIT +no-false-attribs License <https://github.com/rvagg/node-downer-rangedel/blob/master/LICENSE>
 */

#ifndef DRD_ITERATOR_H
#define DRD_ITERATOR_H

#include <node.h>
#include <node_buffer.h>
#include <database.h>
#include <async.h>

LD_SYMBOL ( option_start   , start   );
LD_SYMBOL ( option_end     , end     );
LD_SYMBOL ( option_limit   , limit   );
LD_SYMBOL ( option_reverse , reverse );
LD_SYMBOL ( option_sync    , sync    );

class RangeDelWorker : public leveldown::AsyncWorker {
public:
  RangeDelWorker (
      leveldown::Database* database
    , v8::Persistent<v8::Function> callback
    , leveldb::Slice* start
    , std::string* end
    , bool reverse
    , int limit
    , bool sync
    , v8::Persistent<v8::Value> startPtr
  );
  virtual ~RangeDelWorker ();
  virtual void Execute ();

private:
  leveldb::WriteOptions* options;
  leveldb::Slice* start;
  std::string* end;
  bool reverse;
  int limit;
  bool sync;
  v8::Persistent<v8::Value> startPtr;
};

#endif
