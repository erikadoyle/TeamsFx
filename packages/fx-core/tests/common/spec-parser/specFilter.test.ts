import { expect } from "chai";
import "mocha";
import { specFilter } from "../../../src/common/spec-parser/specFilter";
import { OpenAPIV3 } from "openapi-types";

describe("specFilter", () => {
  const unResolveSpec: OpenAPIV3.Document = {
    openapi: "3.0.0",
    info: {
      title: "My API",
      version: "1.0.0",
    },
    paths: {
      "/hello": {
        get: {
          operationId: "getHello",
          summary: "Returns a greeting",
          responses: {
            "200": {
              description: "A greeting message",
              content: {
                "text/plain": {
                  schema: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: "postHello",
          summary: "Creates a greeting",
          responses: {
            "201": {
              description: "A greeting message",
              content: {
                "text/plain": {
                  schema: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        put: {
          operationId: "putHello",
          summary: "Updates a greeting",
          responses: {
            "200": {
              description: "A greeting message",
              content: {
                "text/plain": {
                  schema: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  it("should return a filtered OpenAPI spec", () => {
    const filter = ["get /hello", "post /hello"];
    const expectedSpec: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
      paths: {
        "/hello": {
          get: {
            operationId: "getHello",
            summary: "Returns a greeting",
            responses: {
              "200": {
                description: "A greeting message",
                content: {
                  "text/plain": {
                    schema: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
          post: {
            operationId: "postHello",
            summary: "Creates a greeting",
            responses: {
              "201": {
                description: "A greeting message",
                content: {
                  "text/plain": {
                    schema: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const actualSpec = specFilter(filter, unResolveSpec);
    expect(actualSpec).to.deep.equal(expectedSpec);
  });

  it("should delete unsupported HTTP methods", () => {
    const filter = ["GET /hello", "PUT /hello"];
    const expectedSpec: OpenAPIV3.Document = {
      openapi: "3.0.0",
      info: {
        title: "My API",
        version: "1.0.0",
      },
      paths: {
        "/hello": {
          get: {
            operationId: "getHello",
            summary: "Returns a greeting",
            responses: {
              "200": {
                description: "A greeting message",
                content: {
                  "text/plain": {
                    schema: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const actualSpec = specFilter(filter, unResolveSpec);
    expect(actualSpec).to.deep.equal(expectedSpec);
  });

  it("should add operationId if missing", () => {
    const filter = ["get /hello/{id}"];
    const unResolvedSpec = {
      openapi: "3.0.0",
      paths: {
        "/hello/{id}": {
          get: {
            responses: {
              "200": {
                description: "OK",
              },
            },
          },
        },
      },
    };
    const expectedSpec = {
      openapi: "3.0.0",
      paths: {
        "/hello/{id}": {
          get: {
            responses: {
              "200": {
                description: "OK",
              },
            },
            operationId: "getHelloId",
          },
        },
      },
    };

    const result = specFilter(filter, unResolvedSpec as any);

    expect(result).to.deep.equal(expectedSpec);
  });

  it("should not filter anything if filter item not exist", () => {
    const filter = ["get /hello"];
    const clonedSpec = { ...unResolveSpec };
    specFilter(filter, unResolveSpec);
    expect(clonedSpec).to.deep.equal(unResolveSpec);
  });

  it("should not filter anything if the filter item does not exist in the OpenAPI spec", () => {
    const filter = ["get /nonexistent"];
    const unResolvedSpec = {
      openapi: "3.0.0",
      paths: {
        "/hello": {
          get: {
            responses: {
              "200": {
                description: "OK",
              },
            },
          },
        },
      },
    };

    const expectedSpec = {
      openapi: "3.0.0",
      paths: {},
    };

    const result = specFilter(filter, unResolvedSpec as any);

    expect(result).to.deep.equal(expectedSpec);
  });

  it("should not modify the original OpenAPI spec", () => {
    const filter = ["get /hello"];
    const clonedSpec = { ...unResolveSpec };
    specFilter(filter, unResolveSpec);
    expect(clonedSpec).to.deep.equal(unResolveSpec);
  });
});
