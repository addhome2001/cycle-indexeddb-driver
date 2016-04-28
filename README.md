# Cycle IndexedDB Driver

**Work in progress**

[Cyclejs](http://cycle.js.org) driver for IndexedDB.

Hackaton project during [Cycleconf 2016](http://cycleconf.com).

## Current progress

More or less only matches the functionality of the current available [localstorage driver]().

## Usage

```js
import Cycle from '@cycle/core';
import storage, { set } from 'cycle-indexeddb-driver';

function main(responses) {
  const responses.storage.store('collection_name').get(id);
  return {
    storage: Observable.of(set('collection_name')(doc))
  };
}

const drivers = {
  storage: storage({
    namespace: 'database_name',
    version: 1,
    store: 'collection_name',
    options: {
      keyPath: 'id',
      unique: true
    }
  })
};

Cycle.run(main, drivers);
```

- see `example/` directory

## Documentation




## License

- see [UNLICENSE](https://github.com/henriklundgren/cycle-indexeddb-driver)

