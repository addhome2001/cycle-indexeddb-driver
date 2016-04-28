import _ from 'ramda';
import {
  Observable,
} from 'rx';

function noop() {}

/** Helper methods **/
export const set = _.curry(function set(_store, data) {
  return _.merge(data, {
    _method: 'set',
    _store,
  });
});
export const unset = _.curry(function unset(_store, id) {
  return {_store, _method: 'unset', id};
});

// TODO action object
function _storeMethod(method) {
  switch (method) {
    case 'set':
      return 'add';
      break;
    case 'unset':
      return 'delete';
      break;
  }
}

export default function storage(options = {}) {

  /**
   * Setup store
   */

  // request open
  const open = _.invoker(2, 'open')(options.namespace)(options.version);
  const request = open(window.indexedDB);

  // success open
  const success$ = Observable.fromEvent(request, 'success').take(1);

  // http://stackoverflow.com/questions/9394902/indexeddb-onversionchange-event-not-fired-in-chrome
  const upgrade$ = Observable.fromEvent(request, 'upgradeneeded').take(1).subscribe(function callback(event) {
    const { oldVersion, newVersion } = event;
    const database = event.target.result;

    if (oldVersion < newVersion) {
      if (_.contains(options.store, database.objectStoreNames)) {
        // delete objectStore (since it is a structural change)
        // TODO Maybe compare current stores with new store and...
        const remove = _.invoker(1, 'removeObjectStore');
        const objectStore = remove(options.store)(database);
      } else {
        const create = _.invoker(2, 'createObjectStore');
        const objectStore = create(options.store)(options.storeOptions)(database);
      }

      Observable.fromEvent(objectStore.transaction, 'error').map(function callback(event) {
        console.log('Error in store', event);
        return void 0;
      }).subscribe(noop);

      Observable.fromEvent(objectStore.transaction, 'complete').map(function callback(event) {
        console.log('We should wait for event until writing to store', event);
        return void 0;
      }).subscribe(noop);
    }
  });

  // how to deal with errors??
  const error$ = Observable.fromEvent(request, 'error')
    .map(event => event.target.error)
    .subscribe(function callback(error) {
      throw error;
    });

  return function(request$) {
    const database$ = success$.map(event => event.target.result);

    /**
     * Store write methods.
     */
    Observable.combineLatest(database$, request$, function callback(database, request) {
      const { id, _method, _store } = request;
      const body = _.omit(['_method', '_store'])(request);
      const STORE_METHOD = _storeMethod(_method);

      const transaction = database.transaction([_store], 'readwrite', 1000);
      const store = transaction.objectStore(_store);
      return store[STORE_METHOD](STORE_METHOD === 'delete' ? request.id : request);
    }).flatMap(function callback(request) {
      // We dont have to set up listeners here, but it would be nice to be able to catch errors.
      const success$ = Observable.fromEvent(request, 'success')
        .map(event => event.target).take(1);
      const error$ = Observable.fromEvent(request, 'error')
        .map(event => event.target).take(1);

      return Observable.combineLatest(success$.startWith(''), error$.startWith(''), function(s,e) {
        return s || e;
      }).startWith('').skip(1);
    }).map(function callback(x) {
      console.log('finally',x);
      return void 0;
    }).subscribe(noop);

    /**
     * return read actions
     */

    return actions(database$);

    function actions(database$) {

      const getStore = function getStore(name, mode = 'readonly') {
        return function callback(database) {
          const transaction = _.invoker(3, 'transaction')([name])(mode)(1000)(database);
          const store = _.invoker(1, 'objectStore')(name)(transaction);
          return store;
        };
      }

      return {
        store(name) {
          return {
            get(key) {
              return database$.map(getStore(name)).map(function callback(store) {
                const get = _.invoker(1, 'get')(key)
                const request = get(store);
                return request;
              }).flatMap(function callback(request) {
                return Observable.fromEvent(request, 'success')
                  .map(event => event.target.result);
              }).startWith(_.always('')());
            },
            cursor(range = null) {
              return database$.map(getStore(name))
                .map(store => store.openCursor(range))
                .flatMap(function callback(cursor) {
                  const cursor$ = Observable.fromEvent(cursor, 'success')
                    .map(event => event.target.result).filter(cursor => cursor);
                  return cursor$;
                });
            },
          }
        },
      };
    }
  };
}

