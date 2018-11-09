import {Model as STModel} from 'sequelize-typescript';
import {NonAbstract} from 'sequelize-typescript/lib/utils/types';



export default abstract class Model<T extends STModel<T>> extends STModel<T>{
  static noExtern?: string[];
  static noIntern?: string[];
  [key: string]: any;
}
export {Model};



export type ModelClazz<T extends Model<T>> = (new () => T) & NonAbstract<typeof Model>;