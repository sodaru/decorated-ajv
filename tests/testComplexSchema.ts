import { JSONSchema7 } from "../src/JSONSchema";

export const schema: JSONSchema7 = {
  type: "object",
  required: ["type"],
  properties: {
    type: {
      enum: [
        "initiateAuth",
        "respondToAuthChallenge",
        "signup",
        "confirmSignup",
        "resendConfirmationCode",
        "forgotPassword",
        "confirmForgotPassword"
      ]
    }
  },
  oneOf: [
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "username", "flow"],
      properties: {
        type: { const: "initiateAuth" },
        username: { type: "string" },
        flow: {
          oneOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["name", "params"],
              properties: {
                name: { const: "USER_SRP_AUTH" },
                params: {
                  type: "object",
                  additionalProperties: false,
                  required: ["srpA"],
                  properties: {
                    srpA: { type: "string" }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["name", "params"],
              properties: {
                name: { const: "REFRESH_TOKEN_AUTH" },
                params: {
                  type: "object",
                  additionalProperties: false,
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" }
                  }
                }
              }
            }
          ]
        }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "username", "challenge"],
      properties: {
        type: { const: "respondToAuthChallenge" },
        username: { type: "string" },
        session: { type: "string" },
        challenge: {
          oneOf: [
            {
              type: "object",
              additionalProperties: false,
              required: ["name", "params"],
              properties: {
                name: { const: "PASSWORD_VERIFIER" },
                params: {
                  type: "object",
                  additionalProperties: false,
                  required: ["signature", "secret", "timestamp"],
                  properties: {
                    signature: { type: "string" },
                    secret: { type: "string" },
                    timestamp: { type: "string" }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["name", "params"],
              properties: {
                name: { const: "NEW_PASSWORD_REQUIRED" },
                params: {
                  type: "object",
                  additionalProperties: false,
                  required: ["newPassword", "userAttributes"],
                  properties: {
                    newPassword: { type: "string" },
                    userAttributes: { type: "object" }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["name", "params"],
              properties: {
                name: { const: "SELECT_MFA_TYPE" },
                params: {
                  type: "object",
                  additionalProperties: false,
                  required: ["type"],
                  properties: {
                    type: { enum: ["SMS_MFA", "SOFTWARE_TOKEN_MFA"] }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["name", "params"],
              properties: {
                name: { enum: ["SMS_MFA", "SOFTWARE_TOKEN_MFA"] },
                params: {
                  type: "object",
                  additionalProperties: false,
                  required: ["code"],
                  properties: {
                    code: { type: "string" }
                  }
                }
              }
            },
            {
              type: "object",
              additionalProperties: false,
              required: ["name", "params"],
              properties: {
                name: { const: "MFA_SETUP" },
                params: {
                  type: "object",
                  additionalProperties: false,
                  required: [],
                  properties: {}
                }
              }
            }
          ]
        }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "username", "password", "attributes"],
      properties: {
        type: { const: "signup" },
        username: { type: "string" },
        password: { type: "string" },
        attributes: { type: "object" }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "username", "code"],
      properties: {
        type: { const: "confirmSignup" },
        username: { type: "string" },
        code: { type: "string", maxLength: 10 }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "username"],
      properties: {
        type: { const: "resendConfirmationCode" },
        username: { type: "string" }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "username"],
      properties: {
        type: { const: "forgotPassword" },
        username: { type: "string" }
      }
    },
    {
      type: "object",
      additionalProperties: false,
      required: ["type", "username", "code", "password"],
      properties: {
        type: { const: "confirmForgotPassword" },
        username: { type: "string" },
        code: { type: "string", maxLength: 10 },
        password: { type: "string" }
      }
    }
  ]
};
