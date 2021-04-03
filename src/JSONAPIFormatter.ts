import Model, { ModelClazz } from "./model";
var JSONAPISerializer = require("jsonapi-serializer").Serializer;
var JSONAPIDeserializer = require("jsonapi-serializer").Deserializer;
const debug = require("debug")("bambus:JSONAPIFormatter");

import { dashCase } from "./misc";
import { BambusContext } from "./jsonApiController";
// import {Context} from 'koa';

interface Formatter {
  status?: number;
}
declare module "koa" {
  interface Context {
    formatter: Formatter;
  }
}

interface IOptions {
  [index: string]: IOptions | Function | string[] | string;
  ["attributes"]?: string[];
  ["typeForAttribute"]?: Function;
  ["ref"]?: string;
}
interface IRelationships {
  id: any;
}

export class JSONAPIFormatter<T extends Model<T>> {
  name: String;
  modelClass: ModelClazz<T>;
  deserializer: any;
  serializers: { [index: string]: any };
  constructor(name: string, modelClass: ModelClazz<T>) {
    this.name = name;
    this.modelClass = modelClass;
    let relationshipsValueFor = getValueForRelFor(this.modelClass);
    this.deserializer = new JSONAPIDeserializer({
      keyForAttribute: "camelCase",
      ...relationshipsValueFor,
    });

    let opts = { attributes: getAllPresentableAttributesFor(modelClass) };
    addRelationships(modelClass, opts, "");
    // debug(name === 'job'? opts: "");
    // debug(opts);
    this.serializers = {};
    this.serializers["noInclude"] = new JSONAPISerializer(name + "s", opts);

    // debug('at init', getAllPresentableAttributesFor(modelClass));
  }
  async middleware(ctx: BambusContext<T>, next: Function) {
    // debug('middleware (jsonAPIFormatter)');
    if (typeof ctx.request.body === "object" && "data" in ctx.request.body) {
      // for now it is jsonapi request // maybe detect with accept or so
      // debug(ctx.request.body);
      ctx.request.body = await this.deserializer.deserialize(ctx.request.body);
      // debug(ctx.request.body);
    }
    ctx.formatter = {};
    try {
      await next();
      // debug('after middleware (jsonAPIFormatter)');
    } catch (err) {
      console.log(err, err.status, err.message);
      if (err.status) {
        ctx.response.status = err.status;
        return;
      } else {
        ctx.response.status = 418;
        return;
      }
    }
    if (ctx.formatter.status) {
      ctx.response.status = ctx.formatter.status;
    }
    if (ctx.model) {
      let toInclude = "noInclude";
      if (ctx.query && ctx.query.include) {
        toInclude = ctx.query.include;
      }
      if (!this.serializers[toInclude]) {
        let opts = {
          attributes: getAllPresentableAttributesFor(this.modelClass),
        };
        addRelationships(this.modelClass, opts, toInclude);
        this.serializers[toInclude] = new JSONAPISerializer(
          this.name + "s",
          opts
        );
      }
      ctx.body = this.serializers[toInclude].serialize(ctx.model);
    } else {
      if (!ctx.response.status) {
        ctx.throw(404);
      }
    }
  }
}

function getAllPresentableAttributesFor<T extends Model<T>>(
  modelClass: ModelClazz<T>
) {
  const noExtern = modelClass.noExtern || [];
  let attributes = Object.keys(modelClass.rawAttributes)
    .concat(Object.keys(modelClass.associations))
    .filter((item) => item !== "id")
    .filter((item) => noExtern.indexOf(item) === -1);
  return attributes;
}

function addRelationships<T extends Model<T>>(
  modelClass: ModelClazz<T>,
  opts: IOptions,
  include: String
) {
  for (let assoc in modelClass.associations) {
    if (include.indexOf(assoc) !== -1) {
      opts[assoc] = {
        ref: "id",
        attributes: getAllPresentableAttributesFor(
          modelClass.associations[assoc].target
        ),
      };
      if (
        assoc !== "attributes" &&
        assoc !== "typeForAttribute" &&
        assoc !== "ref"
      ) {
        //TODO correctly filter out assocs which are for our childs
        addRelationships(
          modelClass.associations[assoc].target,
          <IOptions>opts[assoc],
          ""
        ); // we can cast as we know it will never be another field
      }
    } else {
      opts[assoc] = {
        ref: "id",
      };
    }
  }
  opts.typeForAttribute = function (str: string, attrValue: Model<T>) {
    // only return when we have a constructor
    if (attrValue && attrValue.constructor) {
      return dashCase(attrValue.constructor.name) + "s";
    }
  };
  return opts;
}

function getValueForRelFor<T extends Model<T>>(modelClass: ModelClazz<T>) {
  let obj: {
    [index: string]: {
      valueForRelationship: (relationship: IRelationships) => any;
    };
  } = {};

  let assocs = modelClass.associations;

  for (let assoc in assocs) {
    obj[dashCase(assocs[assoc].target.name) + "s"] = {
      valueForRelationship: function (relationship: IRelationships) {
        return relationship.id;
      },
    };
  }
  return obj;
}
