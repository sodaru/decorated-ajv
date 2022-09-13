import Ajv, { Options, ValidateFunction, ErrorObject } from "ajv";
import addErrors from "ajv-errors";
import addFormats from "ajv-formats";
import { AnySchemaObject, DataValidationCxt } from "ajv/dist/types";
import standaloneCode from "ajv/dist/standalone";
import { JSONSchema7 } from "./JSONSchema";
import { uniq } from "lodash";
import fetch from "cross-fetch";

export type Violation = {
  path: string;
  message: string;
  context: {
    params: Record<string, unknown>;
    propertyName?: string;
    schema?: unknown;
    parentSchema?: unknown;
    data?: unknown;
  };
};

export interface CompiledValidateFunction<T = unknown> {
  (this: Ajv | unknown, data: unknown, dataCxt?: DataValidationCxt): data is T;
  errors?: null | ErrorObject[];
}

const downloadSchemaFromWeb = async (url: string): Promise<AnySchemaObject> => {
  const response = await fetch(url);
  return await response.json();
};

const loadedSchemas: Record<string, AnySchemaObject> = {};

const loadSchema: Options["loadSchema"] = async id => {
  if (!loadedSchemas[id]) {
    loadedSchemas[id] = await downloadSchemaFromWeb(id);
  }
  return loadedSchemas[id];
};

export const getAjv = (options?: Options): Ajv => {
  const ajv = new Ajv({ loadSchema, ...options, allErrors: true });
  addFormats(ajv);
  addErrors(ajv);
  return ajv;
};

export const getValidator = async <T = unknown>(
  schema: JSONSchema7,
  ajv?: Ajv
): Promise<ValidateFunction<T>> => {
  const _ajv = ajv || getAjv();
  const validator = await _ajv.compileAsync<T>(schema);
  return validator;
};

export const getCompiledValidator = async (
  schema: JSONSchema7,
  options: Options = {}
): Promise<string> => {
  const _options = { ...options };
  if (_options.code === undefined) {
    _options.code = {};
  }
  _options.code.source = true;
  const ajv = getAjv(_options);
  const validate = await getValidator(schema, ajv);
  const moduleCode = standaloneCode(ajv, validate);
  return moduleCode;
};

/**
 * @param schema a valid JSON Schema. is ignored if validate function is passed
 * @param data
 * @param validate
 */
export const validate = async <T = unknown>(
  schema: JSONSchema7 | CompiledValidateFunction<T>,
  data: T,
  validate?: ValidateFunction<T>
): Promise<Violation[]> => {
  const _validate =
    validate ||
    (typeof schema == "function" ? schema : await getValidator(schema));

  if (!_validate(data)) {
    const violations = generateViolations(_validate.errors);
    return violations;
  }
  return [];
};

const generateViolations = (errors: ErrorObject[]) => {
  let filteredErrors = errors;
  try {
    filteredErrors = filterErrors(errors);
  } catch (e) {
    // don't do anything
  }

  return filteredErrors.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ instancePath, message, schemaPath, keyword, ...context }) => ({
      path: (instancePath.match(/([^\\/])+/g) || []).join("."),
      message,
      context
    })
  );
};

type ErrorObjectWithFilter = ErrorObject<
  string,
  {
    errors?: ErrorObject[];
    __filter: {
      delete?: boolean;
      oneOf?: string[];
      anyOf?: string[];
      errorMessage?: string;
    };
  }
>;

const filterErrors = (errors: ErrorObject[]): ErrorObject[] => {
  let filteredErrors = errors.map(e => {
    e.params.__filter = {};
    return e as ErrorObjectWithFilter;
  });

  filteredErrors = extractErrorMessageKeyword(filteredErrors);
  const siblings = getSiblings(filteredErrors);

  applyOneOfOrAnyOf(filteredErrors, "oneOf", siblings);
  applyOneOfOrAnyOf(filteredErrors, "anyOf", siblings);

  deleteErrorsForKey(filteredErrors, "allOf");
  deleteErrorsForKey(filteredErrors, "if");
  deleteErrorsForKey(filteredErrors, "then");
  deleteErrorsForKey(filteredErrors, "else");

  let remainingErrors = filteredErrors.filter(e => !e.params?.__filter?.delete);
  if (remainingErrors.length == 0) {
    remainingErrors = [filteredErrors[0]];
  }

  return remainingErrors.map(e => {
    delete e.params.__filter;
    return e;
  });
};

const extractErrorMessageKeyword = (errors: ErrorObjectWithFilter[]) => {
  const allErrors: ErrorObjectWithFilter[] = [];
  errors.forEach(error => {
    if (error.keyword == "errorMessage") {
      if (error.params.errors) {
        const originalErrors = error.params.errors;
        delete error.params.errors;
        const originalErrorsWithFilter = originalErrors.map(e => {
          e.params.__filter = {
            delete: true,
            errorMessage: error.schemaPath
          };
          return e as ErrorObjectWithFilter;
        });
        allErrors.push(...originalErrorsWithFilter);
      }
    }
    allErrors.push(error);
  });
  return allErrors;
};

const getSiblings = (errors: ErrorObjectWithFilter[]) => {
  const siblings: Record<string, string[]> = {};
  errors.forEach(error => {
    if (error.keyword != "errorMessage") {
      const schemaPath = error.schemaPath;
      const parentSchemaPath = schemaPath.substring(
        0,
        schemaPath.lastIndexOf("/")
      );
      errors.forEach(_error => {
        if (_error.keyword != "errorMessage") {
          if (
            !_error.schemaPath.startsWith(schemaPath) &&
            _error.schemaPath.startsWith(parentSchemaPath)
          ) {
            if (!siblings[schemaPath]) {
              siblings[schemaPath] = [];
            }
            siblings[schemaPath].push(_error.schemaPath);
          }
        }
      });
    }
  });
  return siblings;
};

const applyOneOfOrAnyOf = (
  errors: ErrorObjectWithFilter[],
  type: "oneOf" | "anyOf",
  siblings: Record<string, string[]>
) => {
  deleteErrorsForKey(errors, type);

  const typeSchemaPaths = uniq(
    errors.filter(e => e.keyword == type).map(e => e.schemaPath)
  );

  const typeSchemaPathToErrorsMap: Record<string, ErrorObjectWithFilter[]> = {};

  errors.forEach(error => {
    typeSchemaPaths.forEach(typeSp => {
      if (error.schemaPath != typeSp && error.schemaPath.startsWith(typeSp)) {
        if (!error.params.__filter[type]) {
          error.params.__filter[type] = [];
        }
        error.params.__filter[type].push(typeSp);
        if (!typeSchemaPathToErrorsMap[typeSp]) {
          typeSchemaPathToErrorsMap[typeSp] = [];
        }
        typeSchemaPathToErrorsMap[typeSp].push(error);
      }
    });
  });

  Object.keys(typeSchemaPathToErrorsMap).forEach(typeSp => {
    const typeErrors = typeSchemaPathToErrorsMap[typeSp];
    if (siblings[typeSp] && siblings[typeSp].length > 0) {
      typeErrors.forEach(e => {
        e.params.__filter.delete = true;
      });
    } else {
      const typeErrorsByIndex: Record<string, ErrorObjectWithFilter[]> = {};
      typeErrors.forEach(e => {
        const index = e.schemaPath.substring(
          typeSp.length + 1,
          e.schemaPath.indexOf("/", typeSp.length + 1)
        );
        if (!typeErrorsByIndex[index]) {
          typeErrorsByIndex[index] = [];
        }
        typeErrorsByIndex[index].push(e);
      });
      const typeErrorSchemaPathsByIndex: Record<string, string[]> = {};
      Object.keys(typeErrorsByIndex).forEach(index => {
        const schemaPathWithIndexLength = `${typeSp}/${index}/`.length;
        typeErrorSchemaPathsByIndex[index] = uniq(
          typeErrorsByIndex[index].map(e => {
            return e.schemaPath.substring(
              schemaPathWithIndexLength,
              e.schemaPath.indexOf("/", schemaPathWithIndexLength)
            );
          })
        );
      });
      const allIndexes = Object.keys(typeErrorSchemaPathsByIndex);
      let indexWithMinimumErrors = allIndexes[0];
      allIndexes.forEach(i => {
        if (
          typeErrorSchemaPathsByIndex[i].length <
          typeErrorSchemaPathsByIndex[indexWithMinimumErrors].length
        ) {
          indexWithMinimumErrors = i;
        }
      });
      allIndexes.forEach(i => {
        if (i != indexWithMinimumErrors) {
          typeErrorsByIndex[i].forEach(e => {
            e.params.__filter.delete = true;
          });
        }
      });
    }
  });
};

const deleteErrorsForKey = (
  errors: ErrorObjectWithFilter[],
  key: "if" | "then" | "else" | "allOf" | "anyOf" | "oneOf"
) => {
  errors.forEach(e => {
    if (e.keyword == key) {
      e.params.__filter.delete = true;
    }
  });
};
