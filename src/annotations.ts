import { routesSymbol, actionsSymbol } from './symbols'
import {Controller} from './controller';
let debug = require('debug')('bambus:annotation');


export function action(method: string, path: string) { // this is the decorator factory
    return function (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) { // this is the decorator
      if(!target[actionsSymbol]){
        target[actionsSymbol] = {}
      }
      // if we don't have our own copy of the current routes copy it.
      if(!target.hasOwnProperty(actionsSymbol)){
        target[actionsSymbol] = Object.assign({}, target[actionsSymbol]);
      }
      
      target[actionsSymbol][`${method} ${path}`] = {name: propertyKey, func: descriptor};
    }
}


export function route(method: string, path: string) { // this is the decorator factory
  // debug('route(init) ', method, ' ', path);
  
    return function (target: Controller, propertyKey: string, descriptor: PropertyDescriptor) { // this is the decorator
      if(!target[routesSymbol]){
        target[routesSymbol] = {}
      }
      // if we don't have our own copy of the current routes copy it.
      if(!target.hasOwnProperty(routesSymbol)){
        target[routesSymbol] = Object.assign({}, target[routesSymbol]);
      }
      
      target[routesSymbol][`${method} ${path}`] = {name: propertyKey, func: descriptor};
    }
}


