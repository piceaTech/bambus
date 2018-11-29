import * as Router from "koa-router";
import {dashCase, correctFunctionBasedOnName} from './misc'
import { actionsSymbol, routesSymbol } from './symbols';


export interface controllerFunction{
  name: string,
  func: PropertyDescriptor
}

export class Controller {
  prefix: string;
  name: string;
  router: Router;
  [actionsSymbol]: {[name: string]: controllerFunction};
  [routesSymbol]: {[name: string]: controllerFunction};
  constructor(){
    const lastPart = this.constructor.name.slice(-10);
    if(lastPart !== "Controller"){
      throw new Error(`Controller must be named ...Controller. E.g.: UserController`);
    }
    
    
    const firstPart = this.constructor.name.slice(0, -10);
    this.name = dashCase(firstPart);
    this.prefix = this.name + 's'
    this.router = new Router({
      prefix: `/${this.prefix}`
    })
  }
  getRouter(): Router{
    this.createAllActions();
    return this.router;

  }
  createAllActions(){
    for (let name in this[actionsSymbol] || {}) {
      let obj = this[actionsSymbol][name];
      let [method, path] = name.split(' ');
      let toCall = correctFunctionBasedOnName(this.router, method);
      
      toCall(`${method.toUpperCase()} ${this.name}:${obj.name}`, path, obj.func.value.bind(this))


    }
  }
}