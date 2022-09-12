import { JSONSchema7 } from "../src/JSONSchema";

export const schema: JSONSchema7 = {
  type: "object",
  additionalProperties: false,
  required: ["Type", "Properties"],
  properties: {
    Type: {
      const: "SLP::DynamoDb::Item",
      errorMessage: "must be SLP::DynamoDb::Item"
    },
    DependsOn: {
      type: "object",
      additionalProperties: false,
      required: ["resource"],
      properties: {
        module: { type: "string" },
        resource: { type: "string" }
      },
      errorMessage: {
        required: "must have resource"
      }
    },
    Properties: {
      type: "object",
      required: ["TableName"],
      properties: {
        TableName: { type: "string" },
        Auther: { type: "string", format: "email" }
      },
      patternProperties: {
        "^[a-zA-Z0-9#_\\-]+$": true
      },
      additionalProperties: {
        not: true,
        errorMessage: "Additional property ${0#} is not allowed"
      }
    }
  },
  errorMessage: {
    required: "Must have Type and Properties"
  }
};

export const schemaForCompile: JSONSchema7 = {
  type: "object",
  additionalProperties: false,
  required: ["attributes"],
  properties: {
    attributes: {
      allOf: [
        { $ref: "http://json-schema.org/draft-07/schema" },
        {
          type: "object",
          required: ["name", "email"],
          properties: {
            name: { type: "string" },
            email: {
              type: "string",
              format: "email",
              errorMessage: { format: "Enter a Valid Email Id" }
            },
            profile: { type: "string", format: "uri" }
          }
        }
      ]
    }
  }
};
