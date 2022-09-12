import {
  getAjv,
  getCompiledValidator,
  getValidator,
  validate
} from "../src/validator";
import Ajv from "ajv";
import { schema, schemaForCompile } from "./testSchema";
import { schema as complexSchema } from "./testComplexSchema";
import { join } from "path";
import { writeFile } from "fs/promises";

describe("Test JSON Validator", () => {
  test("getAjv", () => {
    const ajv = getAjv();
    expect(ajv).toBeInstanceOf(Ajv);
    expect(Object.keys(ajv.formats)).toEqual([
      "date",
      "time",
      "date-time",
      "duration",
      "uri",
      "uri-reference",
      "uri-template",
      "url",
      "email",
      "hostname",
      "ipv4",
      "ipv6",
      "regex",
      "uuid",
      "json-pointer",
      "json-pointer-uri-fragment",
      "relative-json-pointer",
      "byte",
      "int32",
      "int64",
      "float",
      "double",
      "password",
      "binary"
    ]);
  });

  test("getValidator", () => {
    const validate = getValidator({ type: "string" });
    expect(typeof validate).toEqual("function");
  });

  test("validate", () => {
    expect(validate({ type: "string" }, "this is awesome")).toEqual([]);
  });

  test("validate for root error", () => {
    try {
      validate(schema, null);
    } catch (e) {
      expect(e.message).toMatchSnapshot();
    }
  });

  test("validate for errorMessage at top", () => {
    try {
      validate(schema, {});
    } catch (e) {
      expect(e.message).toMatchSnapshot();
    }
  });

  test("validate for errorMessage at 1 level down", () => {
    try {
      validate(schema, { Type: "", Properties: {} });
    } catch (e) {
      expect(e.message).toMatchSnapshot();
    }
  });

  test("validate for errorMessage at 2 level down", () => {
    try {
      validate(schema, {
        Type: "SLP::DynamoDb::Item",
        DependsOn: {},
        Properties: { TableName: "Table1" }
      });
    } catch (e) {
      expect(e.message).toMatchSnapshot();
    }
  });

  test("validate for errorMessage for additional Properties", () => {
    try {
      validate(schema, {
        Type: "SLP::DynamoDb::Item",
        DependsOn: {
          resource: "my-resource"
        },
        Properties: {
          TableName: "Table1",
          "me@example.com": "This is my email"
        }
      });
    } catch (e) {
      expect(e.message).toMatchSnapshot();
    }
  });

  test("validate with chain", () => {
    try {
      validate(
        null,
        "this is awesome",
        getValidator(schema, getAjv({ strictTuples: false }))
      );
    } catch (e) {
      expect(e.message).toMatchSnapshot();
    }
  });
});

describe("Test getCompiledValidator", () => {
  test("getCompiledValidator", async () => {
    const compiled = getCompiledValidator(schemaForCompile);
    expect(typeof compiled).toEqual("string");

    const compiledSchemaFilePath = join(__dirname, "compiledSchema.js");
    await writeFile(compiledSchemaFilePath, compiled);

    const compiledValidator = (await import(compiledSchemaFilePath)).default;

    expect(typeof compiledValidator).toEqual("function");

    expect(compiledValidator({})).toEqual(false);

    expect(compiledValidator.errors).toMatchSnapshot();

    expect(
      compiledValidator({
        attributes: { name: "Raghavendra", email: "this_must_fail" }
      })
    ).toEqual(false);

    expect(compiledValidator.errors).toMatchSnapshot();

    expect(
      compiledValidator({
        attributes: {
          name: "Raghavendra",
          email: "me@example.com",
          pic: "https://avatar.com/my-pic"
        }
      })
    ).toEqual(true);

    expect(compiledValidator.errors).toMatchSnapshot();
  });

  test("validate with compiledSchema", async () => {
    const compiledSchemaFilePath = join(__dirname, "compiledSchema.js");

    const compiledValidator = (await import(compiledSchemaFilePath)).default;

    expect(validate(compiledValidator, {})).toMatchSnapshot();

    expect(
      validate(compiledValidator, {
        attributes: { name: "Raghavendra", email: "this_must_fail" }
      })
    ).toMatchSnapshot();

    expect(
      validate(compiledValidator, {
        attributes: {
          name: "Raghavendra",
          email: "me@example.com",
          pic: "https://avatar.com/my-pic"
        }
      })
    ).toEqual([]);
  });

  test("performance of compiled schema", async () => {
    const data = {
      attributes: {
        name: "Raghavendra",
        email: "me@example.com",
        pic: "https://avatar.com/my-pic"
      }
    };

    const compiledSchemaFilePath = join(__dirname, "compiledSchema.js");

    const compiledValidator = (await import(compiledSchemaFilePath)).default;

    const t1 = Date.now();
    compiledValidator(data);
    const t2 = Date.now();
    validate(schemaForCompile, data);
    const t3 = Date.now();

    const timeWithCompiled = t2 - t1;
    const timeWithoutCompiled = t3 - t2;

    // eslint-disable-next-line no-console
    console.log({ timeWithCompiled, timeWithoutCompiled });

    expect(timeWithCompiled * 30).toBeLessThan(timeWithoutCompiled);
  });
});

describe("test for complex Schema", () => {
  test("match none of the oneOf options 1", () => {
    expect(validate(complexSchema, {})).toMatchSnapshot();
  });

  test("match none of the oneOf options 2", () => {
    expect(validate(complexSchema, { type: "aaaaa" })).toMatchSnapshot();
  });

  test("partial match oneOf options 1", () => {
    expect(validate(complexSchema, { type: "initiateAuth" })).toMatchSnapshot();
  });

  test("partial match oneOf options 2", () => {
    expect(
      validate(complexSchema, { type: "initiateAuth", challenge: {} })
    ).toMatchSnapshot();
  });

  test("internal match none of oneOf options", () => {
    expect(
      validate(complexSchema, {
        type: "respondToAuthChallenge",
        username: "fsadfd",
        challenge: {}
      })
    ).toMatchSnapshot();
  });

  test("internal partial match oneOf options", () => {
    expect(
      validate(complexSchema, {
        type: "respondToAuthChallenge",
        username: "fsadfd",
        challenge: {
          name: "PASSWORD_VERIFIER"
        }
      })
    ).toMatchSnapshot();
  });
});
