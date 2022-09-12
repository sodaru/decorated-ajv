export { JSONSchema7 } from "json-schema";

type StringMap = { [P in string]?: string };

type ErrorMessageSchema = {
  properties?: StringMap;
  items?: string[];
  required?: string | StringMap;
  dependencies?: string | StringMap;
  _?: string;
} & { [K in string]?: string | StringMap };

declare module "json-schema" {
  interface JSONSchema7 {
    errorMessage?: string | ErrorMessageSchema;
  }
}
