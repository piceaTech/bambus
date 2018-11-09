import * as Router from "koa-router";
import {dashCase, correctFunctionBasedOnName} from './misc'
import { actionsSymbol, routesSymbol } from './symbols';


export interface controllerFunction{
  method: string,
  path:string,
  name: string,
  func: PropertyDescriptor
}

export class Controller {
  prefix: string;
  name: string;
  router: Router;
  [actionsSymbol]: controllerFunction[];
  [routesSymbol]: controllerFunction[];
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
    for (let obj of this[actionsSymbol] || []) {

      let toCall = correctFunctionBasedOnName(this.router, obj.method);

      toCall(`${obj.method.toUpperCase()} ${this.name}:${obj.name}`, obj.path, obj.func.value.bind(this))


    }
  }
}