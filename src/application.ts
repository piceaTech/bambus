const fs = require('fs');
const path = require('path');

import  * as Koa from 'koa';
import * as Router from "koa-router";
import {IMiddleware} from 'koa-router';

const debug = require('debug')('bambus:application');

import { Controller } from './controller';


interface ControllerMap {
    [path: string]: Controller;
}




export default class Bambus{
  application: Koa;
  appRouter: Router;
  controllers: ControllerMap = {};
  constructor(options: Object){
    this.appRouter = new Router(options);
    this.application = new Koa();
  };
  loadControllers(dirName: string){
    // largly copied from typoescript-sequelize
    const controllers = fs.readdirSync(dirName)
    .filter(function(file: string): boolean {
      const filePart = file.slice(-3);
      return filePart === '.js' || (filePart === '.ts' && file.slice(-5) !== '.d.ts');
    })
    .map((file: string) => path.parse(file).name)
    .filter((item: string, index: number, arr: string[]) => arr.indexOf(item) === index) // unique
    .map((fileName: string) => {
      const fullPath = path.join(dirName, fileName);
      const module = require(fullPath);

      if (!module[fileName] && !module.default) {
        throw new Error(`No default export defined for file "${fileName}" or ` +
          `export does not satisfy filename.`);
      }
      return module[fileName] || module.default;
    });
    // debug('controllersToLoad:', controllers);
    for(let controller of controllers){
      // instantiate controller
      let instance: Controller = new controller();
      

      const firstPart = instance.constructor.name.slice(0, -10);
      const name = firstPart.toLowerCase();

      this.controllers[name + 's'] = instance;

      // load routesFrom Controller
      
    }
  };
  loadJobs(dirName: string){
    const jobs = fs.readdirSync(dirName)
    .filter(function(file: string): boolean {
      const filePart = file.slice(-3);
      return filePart === '.js' || (filePart === '.ts' && file.slice(-5) !== '.d.ts');
    })
    .map((file: string) => path.parse(file).name)
    .filter((item: string, index: number, arr: string[]) => arr.indexOf(item) === index) // unique
    .map((fileName: string) => {
      const fullPath = path.join(dirName, fileName);
      const module = require(fullPath);

      if (!module[fileName] && !module.default) {
        throw new Error(`No default export defined for file "${fileName}" or ` +
          `export does not satisfy filename.`);
      }
      return module[fileName] || module.default;
    });
    // debug('jobsToLoad:', jobs);
    for(let job of jobs){
      
    }
  }
  use(fn: IMiddleware) {
    // debug('thisinIndex', this, fn);
    this.appRouter.use(fn);
  }

  prepare(){
    for(let controller in this.controllers){
      let instance = this.controllers[controller];
      let instanceRouter = instance.getRouter();
      this.appRouter.use(instanceRouter.routes());
      this.appRouter.use(instanceRouter.allowedMethods());
    }
    this.application.use(this.appRouter.routes());
    this.application.use(this.appRouter.allowedMethods());
  }

  listen(port: number){
    this.prepare();
    this.application.listen(...arguments);
  }
  get app(){
    return this.application;
  }

}