# Decorated AJV (Another JSON Validator)

AJV decorated with error handling and formats.

> Added Decorations
>
> - added [ajv-formats](https://www.npmjs.com/package/ajv-formats)
> - added [ajv-errors](https://www.npmjs.com/package/ajv-errors)
> - added `errorMessage` keyword to JSONSchema7 type from [@types/json-schema](https://www.npmjs.com/package/@types/json-schema)
> - filter redundant errors

## Install

```
npm i decorated-ajv
```

## Usage

### Get a decorated ajv object

```typescript
import { getAjv } from "decorated-ajv";

const ajv = getAjv(); // returns an ajv instanse with loaded ajv-errors and ajv-formats
```

### Get a decorated ajv validator

```typescript
import { getValidator } from "decorated-ajv";

const validator = getValidator(schema, ajv); // ajv is optional
```

### Validate the data against a schema

```typescript
import { validate, Violation } from "decorated-ajv";

const violations: Violation = validate(schema, data, validator); // validator is optional, if provided schema is ignored
```

### Get Compiled Validator

```typescript
import { getCompiledValidator } from "decorated-ajv";

const standaloneValidator = getCompiledValidator(schema, ajvOptions); // ajvOptions is optional
```

Read more about standalone ajv validator [here](https://ajv.js.org/standalone.html)
