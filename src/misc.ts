import * as Router from "koa-router";
import { Context } from 'koa';
import {getAssociations} from 'sequelize-typescript/lib/services/association';
import {IIncludeOptions} from 'sequelize-typescript/lib/interfaces/IIncludeOptions';
import Model, {ModelClazz} from './model';


const debug = require('debug')('bambus:misc');

export function loadJobs(dirName: string){
  
}

interface KoaBody{
  [index: string]: any
}

interface includeParamInterface{
  [index: string]: {
    model: any, attributes?: string[], as: string
  }
}


export async function setRelationshipsFromData<T extends Model<T>>(model: T, body: KoaBody){
  // console.log('misc', model);
  let modelConstructor : ModelClazz<T> = <ModelClazz<T>> model.constructor;
  for (let assoc in modelConstructor.associations) {
    debug('assoc', assoc, modelConstructor.associations[assoc].associationType);//, modelConstructor.associations[assoc].target);
    if(body[assoc] !== undefined){
      if(Array.isArray(body[assoc])){
        for (let i in body[assoc]) {
          body[assoc][i] = +body[assoc][i];
          // TODO besser erkennen, wenn es sich um einen nicht numerischen Typ handelt
        }
      }
      else{
        if(body[assoc] !== null){
          body[assoc] = +body[assoc];
        }
      }
      debug('set', assoc, body[assoc]);
      model[modelConstructor.associations[assoc].options.foreignKey.name] = body[assoc];
      // await model.$set(assoc, body[assoc]);
    }
  }
  debug('now back');
}




export function parseIncludeParam<T extends Model<T>>(ctx: Context, modelClass: ModelClazz<T>): Array<IIncludeOptions>{
  let includeQuery = (ctx && ctx.query && ctx.query.include) || "";
  delete ctx.query.include; // TODO make faster
  let toReturn: includeParamInterface = {};

  for (let assoc in modelClass.associations) {
    if(!modelClass.noExtern || modelClass.noExtern.indexOf(assoc) === -1){
      // debug(modelClass, modelClass.associations[assoc].target);
      // debug(modelClass.associations[assoc].as);
      toReturn[assoc] = {model: modelClass.associations[assoc].target, attributes: ['id'], as: modelClass.associations[assoc].as}; // modelClass.associations[assoc]
    }
  }


  const splitArray = includeQuery.split(',');
  for (let include of splitArray) {
    if(!include || (modelClass.noExtern.indexOf(include) !== -1)){
      continue;
    }
    if(!toReturn[include]){
      ctx.throw(400)
    }
    toReturn[include] = {model: toReturn[include].model, as: toReturn[include].as};
  }
  const toReturnArray = Object.keys(toReturn).map(function (key) { return toReturn[key]; });
  return toReturnArray;
}

export function dashCase(str: string) :string {
  return str.replace(/[A-Z](?:(?=[^A-Z])|[A-Z]*(?=[A-Z][^A-Z]|$))/g, function (s:string, i: number) {
    return (i > 0 ? '-' : '') + s.toLowerCase();
  });
}

export function correctFunctionBasedOnName(router: Router, methodName: string): Function {
  let toCall = router.get.bind(router);
  switch(methodName){
    case 'post':
      toCall = router.post.bind(router);
      break;
    case 'patch':
      toCall = router.patch.bind(router);
      break;
    case 'delete':
      toCall = router.del.bind(router);
      break;
    default:
  }
  return toCall;
}
export function filterBody<T extends Model<T>>(body: any, modelClass: ModelClazz<T>){
  // remove all entities which are in the
  for(let notIntern of modelClass.noIntern){
    if(typeof body[notIntern] !== 'undefined'){
      body[notIntern] = undefined;
    }
  }

}


