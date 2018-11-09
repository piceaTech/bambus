import { routesSymbol, actionsSymbol } from './symbols'
import {Controller} from './controller';
let debug = require('debug')('bambus:annotation');


export function action(method: string, path: string) { // this is the decorator factory
    return function (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) { // this is the decorator
      if(!target[actionsSymbol]){
        target[actionsSymbol] = []
      }
      target[actionsSymbol].unshift({method, path, name: propertyKey, func: descriptor})
      // debug('route: ', method, ' ', propertyKey);

      // debug('requiresLogin: ' + value + target);
    }
}


export function route(method: string, path: string) { // this is the decorator factory
  // debug('route(init) ', method, ' ', path);
  
    return function (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) { // this is the decorator
        // do something with 'target' and 'value'...
      if(!target[routesSymbol]){
        target[routesSymbol] = []
      }
      target[routesSymbol].unshift({method, path, name: propertyKey, func: descriptor})
      // debug('route: ', method, ' ', propertyKey);

      // debug('requiresLogin: ' + value + target);
    }
}


