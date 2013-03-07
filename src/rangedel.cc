/* Copyright (c) 2013 Rod Vagg
 * MIT +no-false-attribs License <https://github.com/rvagg/node-downer-rangedel/blob/master/LICENSE>
 */

#include <node.h>
#include <node_buffer.h>
#include <leveldb/slice.h>
#include <leveldown.h>
#include <iterator.h>
#include "rangedel.h"

#include <iostream>


/** RangeDelWorker, to do the actual delete work
  * extends from AsyncWorker in LevelDOWN, a lot of the dirty
  * async work is handled there.
  */
RangeDelWorker::RangeDelWorker (
    leveldown::Database* database
  , v8::Persistent<v8::Function> callback
  , leveldb::Slice* start
  , std::string* end
  , bool reverse
  , int limit
  , bool sync
  , v8::Persistent<v8::Value> startPtr
) : leveldown::AsyncWorker(database, callback)
  , start(start)
  , end(end)
  , reverse(reverse)
  , limit(limit)
  , sync(sync)
  , startPtr(startPtr)
{
  options       = new leveldb::WriteOptions();
  options->sync = sync;
};

RangeDelWorker::~RangeDelWorker () {
  delete options;
}

void RangeDelWorker::Execute () {
  leveldown::Iterator* iterator = new leveldown::Iterator(
      database
    , start
    , end
    , reverse
    , true  // keys
    , false // values
    , limit
    , false // fillCache
    , false // keyAsBuffer
    , false // valueAsBuffer
    , startPtr
  );

  // these next lines are the actual range-delete operation
  std::string key;
  while (iterator->IteratorNext(key, key)) {
    database->DeleteFromDatabase(options, leveldb::Slice(key));
  }
  iterator->IteratorEnd();
}

/** The concrete implementation of the .rangeDel() method attached
  * to a LevelDOWN instance.
  * copied mostly from LevelDOWN iterator.cc Iterator::New()
  * because the functionality is very similar to making a new iterator
  */
v8::Handle<v8::Value> NewRangeDel (const v8::Arguments& args) {
  v8::HandleScope scope;

  LD_METHOD_SETUP_COMMON(rangeDel, 0, 1)

  v8::Local<v8::Value> startBuffer;
  leveldb::Slice* start = NULL;
  std::string* end = NULL;
  int limit = -1;


  if (!optionsObj.IsEmpty() && optionsObj->Has(option_start)
      && (node::Buffer::HasInstance(optionsObj->Get(option_start))
        || optionsObj->Get(option_start)->IsString())) {

    startBuffer = v8::Local<v8::Value>::New(optionsObj->Get(option_start));
    LD_STRING_OR_BUFFER_TO_SLICE(_start, startBuffer, Start)
    start = new leveldb::Slice(_start.data(), _start.size());
  }

  if (!optionsObj.IsEmpty() && optionsObj->Has(option_end)
      && (node::Buffer::HasInstance(optionsObj->Get(option_end))
        || optionsObj->Get(option_end)->IsString())) {

    v8::Local<v8::Value> endBuffer =
        v8::Local<v8::Value>::New(optionsObj->Get(option_end));
    LD_STRING_OR_BUFFER_TO_SLICE(_end, endBuffer, End)
    end = new std::string(_end.data(), _end.size());
  }

  if (!optionsObj.IsEmpty() && optionsObj->Has(option_limit)) {
    limit =
      v8::Local<v8::Integer>::Cast(optionsObj->Get(option_limit))->Value();
  }

  LD_BOOLEAN_OPTION_VALUE(optionsObj, reverse)
  LD_BOOLEAN_OPTION_VALUE(optionsObj, sync)

  RangeDelWorker* worker = new RangeDelWorker(
      database
    , callback
    , start
    , end
    , reverse
    , limit
    , sync
    , v8::Persistent<v8::Value>::New(startBuffer)
  );

  AsyncQueueWorker(worker);

  return v8::Undefined();
}

/** Our plugin that extends from the base Plugin class in LevelDOWN.
  * We just need a Name(), and an Init() that is run each time new LevelDOWN
  * instance is created.
  */
class RangedelPlugin : public leveldown::Plugin {
public:
  RangedelPlugin () {}

  const char* Name () {
    return "Downer Rangedel";
  }

  void Init (v8::Local<v8::Object> database) {
    // given a LevelDOWN instance, attach a .rangeDel() method to it
    // using the implementation above
    database->Set(
        v8::String::NewSymbol("rangeDel")
      , v8::FunctionTemplate::New(NewRangeDel)->GetFunction()
    );
  }

};

LD_PLUGIN(rangedel, RangedelPlugin)
