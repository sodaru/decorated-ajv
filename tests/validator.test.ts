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

  test("getValidator", async () => {
    const validate = await getValidator({ type: "string" });
    expect(typeof validate).toEqual("function");
  });

  test("validate", async () => {
    await expect(
      validate({ type: "string" }, "this is awesome")
    ).resolves.toEqual([]);
  });

  test("validate for root error", async () => {
    await expect(validate(schema, null)).resolves.toMatchSnapshot();
  });

  test("validate for errorMessage at top", async () => {
    await expect(validate(schema, {})).resolves.toMatchSnapshot();
  });

  test("validate for errorMessage at 1 level down", async () => {
    await expect(
      validate(schema, { Type: "", Properties: {} })
    ).resolves.toMatchSnapshot();
  });

  test("validate for errorMessage at 2 level down", async () => {
    await expect(
      validate(schema, {
        Type: "SLP::DynamoDb::Item",
        DependsOn: {},
        Properties: { TableName: "Table1" }
      })
    ).resolves.toMatchSnapshot();
  });

  test("validate for errorMessage for additional Properties", async () => {
    await expect(
      validate(schema, {
        Type: "SLP::DynamoDb::Item",
        DependsOn: {
          resource: "my-resource"
        },
        Properties: {
          TableName: "Table1",
          "me@example.com": "This is my email"
        }
      })
    ).resolves.toMatchSnapshot();
  });

  test("validate with chain", async () => {
    await expect(
      validate(
        null,
        "this is awesome",
        await getValidator(schema, getAjv({ strictTuples: false }))
      )
    ).resolves.toMatchSnapshot();
  });
});

describe("Test getCompiledValidator", () => {
  test("getCompiledValidator", async () => {
    const compiled = await getCompiledValidator(schemaForCompile);
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

    await expect(validate(compiledValidator, {})).resolves.toMatchSnapshot();

    await expect(
      validate(compiledValidator, {
        attributes: { name: "Raghavendra", email: "this_must_fail" }
      })
    ).resolves.toMatchSnapshot();

    await expect(
      validate(compiledValidator, {
        attributes: {
          name: "Raghavendra",
          email: "me@example.com",
          pic: "https://avatar.com/my-pic"
        }
      })
    ).resolves.toEqual([]);
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
    await validate(schemaForCompile, data);
    const t3 = Date.now();

    const timeWithCompiled = t2 - t1;
    const timeWithoutCompiled = t3 - t2;

    // eslint-disable-next-line no-console
    console.log({ timeWithCompiled, timeWithoutCompiled });

    expect(timeWithCompiled * 30).toBeLessThan(timeWithoutCompiled);
  });
});

describe("test for complex Schema", () => {
  test("match none of the oneOf options 1", async () => {
    await expect(validate(complexSchema, {})).resolves.toMatchSnapshot();
  });

  test("match none of the oneOf options 2", async () => {
    await expect(
      validate(complexSchema, { type: "aaaaa" })
    ).resolves.toMatchSnapshot();
  });

  test("partial match oneOf options 1", async () => {
    await expect(
      validate(complexSchema, { type: "initiateAuth" })
    ).resolves.toMatchSnapshot();
  });

  test("partial match oneOf options 2", async () => {
    await expect(
      validate(complexSchema, { type: "initiateAuth", challenge: {} })
    ).resolves.toMatchSnapshot();
  });

  test("internal match none of oneOf options", async () => {
    await expect(
      validate(complexSchema, {
        type: "respondToAuthChallenge",
        username: "fsadfd",
        challenge: {}
      })
    ).resolves.toMatchSnapshot();
  });

  test("internal partial match oneOf options", async () => {
    await expect(
      validate(complexSchema, {
        type: "respondToAuthChallenge",
        username: "fsadfd",
        challenge: {
          name: "PASSWORD_VERIFIER"
        }
      })
    ).resolves.toMatchSnapshot();
  });
});

describe("Test validator with async schema load", () => {
  test("test schema loaded from web", async () => {
    await expect(
      validate(
        {
          type: "object",
          properties: {
            inputs: {
              $ref: "https://form-input-schema.json-schema.sodaru.com/schemas/index.json#/properties/inputs"
            }
          }
        },
        { inputs: { url: { type: "text" } } }
      )
    ).resolves.toEqual([]);
  }, 20000);
});
