import {Context as KoaContext} from 'koa';
import * as Router from "koa-router";
const debug = require('debug')('bambus:controller');

import {Controller} from './controller';
import Model, {ModelClazz} from './model';


import {setRelationshipsFromData, parseIncludeParam, dashCase, correctFunctionBasedOnName, filterBody} from './misc'

import {JSONAPIFormatter} from './JSONAPIFormatter';
import { route, action } from './annotations'
import { routesSymbol, actionsSymbol } from './symbols';



export interface BambusContext<T extends Model<T>> extends KoaContext{
  model: T | T[]
}


export class JSONAPIController<T extends Model<T>> extends Controller{
  canSaveWithoutRelationships: Boolean;
  modelAssocs: String[];

  modelClass: ModelClazz<T>;

  @route('get', '/')
  async getAll(ctx: BambusContext<T>, next: Function) {
    debug(`getall ${this.name}`);
    let wherePart = ctx.state.query || ctx.query || {};
    ctx.model = await this.modelClass.findAll({where: wherePart, include: parseIncludeParam(ctx, this.modelClass)}); // TODO
    // wir müssen hier besser mal noch nachsehen, dass wir nicht alles mitnehmen
    // es müssen immer alle relationships dargestellt werden,
  }
  @route('get', '/:id')
  async getOne(ctx: BambusContext<T>, next: Function){
    debug(`get ${this.name} ${ctx.params.id}`);
    ctx.model = await this.modelClass.findOne<T>({where: {id: ctx.params.id, ...ctx.state.query},
      include: parseIncludeParam(ctx, this.modelClass)
    });
  }
  @route('post', '/')
  async post(ctx: BambusContext<T>, next: Function){
    debug(`post ${this.name}`);

    if(ctx.request.body && typeof ctx.request.body === 'object' && 'id' in ctx.request.body){
      return ctx.formatter.status = 404;
    }
    // debug(ctx.request.body);
    let modelToCreate = null;
    filterBody(ctx.request.body, this.modelClass);
    // if(this.canSaveWithoutRelationships){
      /* braucht man wohl möglicherweise doch erstmal nicht, weil keine compound documents gespeichert werden können*/

      modelToCreate = this.modelClass.build(ctx.request.body);
      // if model has 
      await setRelationshipsFromData(modelToCreate, ctx.request.body); // das schreibt schon in die DB. Macht es das wirklich?
      await modelToCreate.save();

      // compound document creation: http://docs.sequelizejs.com/manual/tutorial/associations.html#creating-with-associations
    // }
    // else{
    //   debug(ctx.request.body);
    //   const modelToCreate = new this.modelClass(ctx.request.body);
    //   return ctx.throw('isn\'t tested for now');
    //   // TODO wie müssen wir das assignen? Wir erstellen nur eine instance und es muss das andere Model schon existieren, daher sollte es nicht so schwer sein.
    //   //   const modelToCreate = new this.modelClass(ctx.request.body);
    // }
    
    // @ts-ignore Fehler weil der generische keine id festgelegt hat, aber ich das einfach mal voraussetze
    ctx.model = await this.modelClass.findOne<T>({where: {
        id: modelToCreate.id
      },
      include: [{all: true, attributes: ['id']}]
    });
    
  }
  @route('patch', '/:id')
  async patch(ctx: BambusContext<T>, next: Function){
    debug(`patch ${this.name}`);
    let model = await this.modelClass.findOne<T>({where: ctx.state.query || {id: ctx.params.id}});

    filterBody(ctx.request.body, this.modelClass);

    if(typeof ctx.request.body !== 'object'){
      return ctx.formatter.status = 404;
    }
    else{
      let attributes = Object.keys(ctx.request.body).filter(item => this.modelAssocs.indexOf(item) === -1)
      for (let attribute of attributes) {
        debug(attribute);
        model[attribute] = (ctx.request.body as any)[attribute]; //it is definitly a key of the body
      }
      debug(ctx.request.body);
      await setRelationshipsFromData(model, ctx.request.body); // das schreibt schon in die DB. Macht es das wirklich?
      // debug(model.get('customer'), model);
      await model.save();
      
      // @ts-ignore Fehler weil der generische keine id festgelegt hat, aber ich das einfach mal voraussetze
      ctx.model = await this.modelClass.findOne<T>({where: {
          id: ctx.params.id
        },
        include: [{all: true, attributes: ['id']}]
      });
      ctx.formatter.status = 201;
    }
  }
  @route('delete', '/:id')
  async del(ctx: BambusContext<T>, next: Function){
    debug(`get ${this.name} ${ctx.params.id}`);
    await this.modelClass.destroy({where: ctx.state.query || {id: ctx.params.id}});
    
    ctx.formatter.status = 204;
  }

  createAllRoutes(){
    // migration nach misc
    for (let obj of this[routesSymbol] || []) {

      let toCall = correctFunctionBasedOnName(this.router, obj.method);
      
      toCall(`${obj.method.toUpperCase()} ${this.name}:${obj.name}`, obj.path, obj.func.value.bind(this))


    }
  }
  getRouter() : Router{
    if(!this.modelClass){

      console.log(`The Controller ${this.name} has no modelClass defined, but is a JSONAPIController which needs that. Please define it in the class like:
        modelClass = YourModel;`);
      process.exit(1);
    }
    else if(!(this.modelClass.prototype instanceof Model)){
      console.log(`The Controller ${this.name} has no modelClass defined which is not a subclass of bambus.Model. Import the model and subclass like this:
        export class MyModel extends Model<MyModel>`);
      process.exit(1);
    }
    // setup whether we can save model without relationsShipsFirst
    this.canSaveWithoutRelationships = true;
    this.modelAssocs = [];
    for (let assoc in this.modelClass.associations) {
      this.modelAssocs.push(assoc)
      if(this.modelClass.associations[assoc].associationType === 'BelongsTo'){
        this.canSaveWithoutRelationships = false;
        break;
      }
    }

    // debug(this[routesSymbol]);

    this.createAllActions();

    const formatter = new JSONAPIFormatter<T>(this.name, this.modelClass)
    this.router.use(formatter.middleware.bind(formatter))

    this.createAllRoutes();
    
    return this.router;
  }
}