import path from 'path';
import { ExportDeclarationStructure, ImportDeclarationStructure, OptionalKind, SourceFile, VariableDeclarationKind } from 'ts-morph';
import { GeneratorOptions } from './options';
import { argsFolderName, crudFolderName, enumsFolderName, inputsFolderName, modelsFolderName, outputsFolderName, relationsResolversFolderName, resolversFolderName, typeDefsFolderName } from './config';
import { EmitBlockKind } from './emit-block';
import { GenerateMappingData } from './types';

export function generateTypeGraphQLImport(sourceFile: SourceFile) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: "type-graphql",
    namespaceImport: "TypeGraphQL",
  });
}

export function generateGraphQLFieldsImport(sourceFile: SourceFile) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: "graphql-fields",
    defaultImport: "graphqlFields",
  });
}

export function generateGraphQLInfoImport(sourceFile: SourceFile) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: "graphql",
    isTypeOnly: true,
    namedImports: ["GraphQLResolveInfo"],
  });
}

export function generateGraphQLScalarsImport(sourceFile: SourceFile) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: "graphql-scalars",
    namespaceImport: "GraphQLScalars",
  });
}

export function generateGraphQLScalarTypeImport(sourceFile: SourceFile) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: "graphql",
    namedImports: ["GraphQLScalarType"],
  });
}

export function generateGraphQLSubscriptionsImport(sourceFile: SourceFile) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: "graphql-subscriptions",
    namedImports: ["PubSub"],
  });
}

export function generateGraphQLWebSocketImport(sourceFile: SourceFile) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: "graphql-ws/lib/server",
    namedImports: ["Context"],
  });
}

export function generateCustomScalarsImport(sourceFile: SourceFile, level = 0) {
  sourceFile.addImportDeclaration({
    moduleSpecifier:
      (level === 0 ? "./" : "") +
      path.posix.join(...Array(level).fill(".."), "scalars"),
    namedImports: ["DecimalJSScalar"],
  });
}

export function generateHelpersFileImport(sourceFile: SourceFile, level = 0) {
  sourceFile.addImportDeclaration({
    moduleSpecifier:
      (level === 0 ? "./" : "") +
      path.posix.join(...Array(level).fill(".."), "helpers"),
    namedImports: [
      "transformInfoIntoPrismaArgs",
      "getPrismaFromContext",
      "transformCountFieldIntoSelectRelationsCount",
    ],
  });
}

export function generateTypesFileImport(sourceFile: SourceFile, level = 0) {
  sourceFile.addImportDeclaration({
    moduleSpecifier:
      (level === 0 ? "./" : "") +
      path.posix.join(...Array(level).fill(".."), "types"),
    namedImports: [
      "GraphQLContext",
    ],
  });
}

export function generatePrismaNamespaceImport(
  sourceFile: SourceFile,
  options: GeneratorOptions,
  level = 0,
) {
  sourceFile.addImportDeclaration({
    moduleSpecifier:
      options.absolutePrismaOutputPath ??
      (level === 0 ? "./" : "") +
        path.posix.join(
          ...Array(level).fill(".."),
          options.customPrismaImportPath ?? options.relativePrismaOutputPath,
        ),
    namedImports: ["Prisma"],
  });
}

export function generatePrismaClientImport(
  sourceFile: SourceFile,
  options: GeneratorOptions,
  level = 0,
) {
  sourceFile.addImportDeclaration({
    // moduleSpecifier: "@prisma/client",
    moduleSpecifier:
      options.absolutePrismaOutputPath ??
      (level === 0 ? "./" : "") +
        path.posix.join(
          ...Array(level).fill(".."),
          options.customPrismaImportPath ?? options.relativePrismaOutputPath,
        ),
    namedImports: ["PrismaClient"],
  });
}

export function generateArgsBarrelFile(
  sourceFile: SourceFile,
  argsTypeNames: string[],
) {
  sourceFile.addExportDeclarations(
    argsTypeNames
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>(argTypeName => ({
        moduleSpecifier: `./${argTypeName}`,
        namedExports: [argTypeName],
      })),
  );
}

export function generateArgsIndexFile(
  sourceFile: SourceFile,
  typeNames: string[],
) {
  sourceFile.addExportDeclarations(
    typeNames
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>(typeName => ({
        moduleSpecifier: `./${typeName}/args`,
      })),
  );
}

export function generateModelsBarrelFile(
  sourceFile: SourceFile,
  modelNames: string[],
) {
  sourceFile.addExportDeclarations(
    modelNames
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>(modelName => ({
        moduleSpecifier: `./${modelName}`,
        namedExports: [modelName],
      })),
  );
}

// TODO: used by prisma-to-graphql-server
export function generateGraphQLModelsBarrelFile(
  sourceFile: SourceFile,
  modelNames: string[],
) {
  sourceFile.addImportDeclarations(
    modelNames
      .sort()
      .map<OptionalKind<ImportDeclarationStructure>>(enumTypeName => ({
        moduleSpecifier: `./${enumTypeName}`,
        defaultImport: enumTypeName,
      })),
  );

  sourceFile.addVariableStatement({
    // isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
    {
        name: 'models',
        initializer: `[
${modelNames.join(",\n")}
]`,
        },
        ],
    });

    sourceFile.addExportAssignment({
        isExportEquals: false,
        expression: 'models',
    });
}

// TODO: used by prisma-to-graphql-client
export function generateEnumsBarrelFile(
  sourceFile: SourceFile,
  enumTypeNames: string[],
) {
  sourceFile.addExportDeclarations(
    enumTypeNames
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>(enumTypeName => ({
        moduleSpecifier: `./${enumTypeName}`,
        namedExports: [enumTypeName],
      })),
  );
}

// TODO: used by prisma-to-graphql-server
export function generateGraphQLEnumsBarrelFile(
  sourceFile: SourceFile,
  enumTypeNames: string[],
) {
//   sourceFile.addImportDeclarations(
//     enumTypeNames
//       .sort()
//       .map<OptionalKind<ImportDeclarationStructure>>(enumTypeName => ({
//         moduleSpecifier: `./${enumTypeName}`,
//         namedImports: [enumTypeName],
//       })),
//   );
  sourceFile.addImportDeclarations(
    enumTypeNames
      .sort()
      .map<OptionalKind<ImportDeclarationStructure>>(enumTypeName => ({
        moduleSpecifier: `./${enumTypeName}`,
        defaultImport: enumTypeName,
      })),
  );
//   sourceFile.addImportDeclarations({
//     moduleSpecifier: "graphql-scalars",
//     namespaceImport: "GraphQLScalars",
//   });

  sourceFile.addVariableStatement({
    // isExported: true,
    declarationKind: VariableDeclarationKind.Const,
    declarations: [
    {
        name: 'enums',
        initializer: `[
${enumTypeNames.join(",\n")}
]`,
        },
        ],
    });

    sourceFile.addExportAssignment({
        isExportEquals: false,
        expression: 'enums',
    });
}

export function generateInputsBarrelFile(
  sourceFile: SourceFile,
  inputTypeNames: string[],
) {
  sourceFile.addExportDeclarations(
    inputTypeNames
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>(inputTypeName => ({
        moduleSpecifier: `./${inputTypeName}`,
        namedExports: [inputTypeName],
      })),
  );
}

export function generateOutputsBarrelFile(
  sourceFile: SourceFile,
  outputTypeNames: string[],
  hasSomeArgs: boolean,
) {
  sourceFile.addExportDeclarations(
    outputTypeNames
      .sort()
      .map<OptionalKind<ExportDeclarationStructure>>(outputTypeName => ({
        moduleSpecifier: `./${outputTypeName}`,
        namedExports: [outputTypeName],
      })),
  );
  if (hasSomeArgs) {
    sourceFile.addExportDeclaration({ moduleSpecifier: `./${argsFolderName}` });
  }
}

export function generateIndexFile_GqlServer(
  sourceFile: SourceFile,
  hasSomeRelations: boolean,
  blocksToEmit: EmitBlockKind[],
) {
  if (blocksToEmit.includes("enums")) {
    sourceFile.addExportDeclaration({
      moduleSpecifier: `./${resolversFolderName}/${enumsFolderName}`,
    });
  }
  if (blocksToEmit.includes("models")) {
    sourceFile.addExportDeclaration({
      moduleSpecifier: `./${resolversFolderName}/${modelsFolderName}`,
    });
  }
  if (blocksToEmit.includes("crudResolvers")) {
    // sourceFile.addExportDeclaration({
    //   moduleSpecifier: `./${resolversFolderName}/${crudFolderName}`,
    // });
    sourceFile.addImportDeclaration({
      moduleSpecifier: `./${resolversFolderName}/${crudFolderName}/resolvers-crud.index`,
      namespaceImport: "crudResolversImport",
    });
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: "crudResolvers",
          initializer: `Object.values(crudResolversImport) as unknown as Array<Function>`,
        },
      ],
    });
    // *************
    // sourceFile.addExportDeclaration({
    //   moduleSpecifier: `./${typeDefsFolderName}/${crudFolderName}`,
    // });
    sourceFile.addImportDeclaration({
      moduleSpecifier: `./${typeDefsFolderName}/${crudFolderName}/typedefs-crud.index`,
      namespaceImport: "crudTypeDefsImport",
    });
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: "crudTypeDefs",
          initializer: `Object.values(crudTypeDefsImport) as unknown as Array<Function>`,
        },
      ],
    });
  }
  if (hasSomeRelations && blocksToEmit.includes("relationResolvers")) {
    sourceFile.addExportDeclaration({
      moduleSpecifier: `./${resolversFolderName}/${relationsResolversFolderName}`,
    });
    sourceFile.addImportDeclaration({
      moduleSpecifier: `./${resolversFolderName}/${relationsResolversFolderName}/resolvers.index`,
      namespaceImport: "relationResolversImport",
    });
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: "relationResolvers",
          initializer: `Object.values(relationResolversImport) as unknown as Array<Function>`,
        },
      ],
    });
  }
  if (blocksToEmit.includes("inputs")) {
    sourceFile.addExportDeclaration({
      moduleSpecifier: `./${resolversFolderName}/${inputsFolderName}`,
    });
  }
  if (blocksToEmit.includes("outputs")) {
    sourceFile.addExportDeclaration({
      moduleSpecifier: `./${resolversFolderName}/${outputsFolderName}`,
    });
  }

  sourceFile.addExportDeclarations([
    { moduleSpecifier: `./enhance` },
    { moduleSpecifier: `./scalars` },
  ]);
  // sourceFile.addImportDeclarations([
  //   {
  //     moduleSpecifier: `type-graphql`,
  //     namedImports: ["NonEmptyArray"],
  //   },
  // ]);

  if (
    blocksToEmit.includes("crudResolvers") ||
    (hasSomeRelations && blocksToEmit.includes("relationResolvers"))
  )
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: "resolvers",
          initializer: `[
            ${blocksToEmit.includes("crudResolvers") ? "...crudResolvers," : ""}
            ${
              hasSomeRelations && blocksToEmit.includes("relationResolvers")
                ? "...relationResolvers,"
                : ""
            }
            ] as unknown as Array<Function>`,
        },
      ],
    });
    // *************
    sourceFile.addVariableStatement({
      isExported: true,
      declarationKind: VariableDeclarationKind.Const,
      declarations: [
        {
          name: "typeDefs",
          initializer: `[
            ${blocksToEmit.includes("crudResolvers") ? "...crudTypeDefs," : ""}
            ] as unknown as Array<Function>`,
        },
      ],
    });
}

export function generateResolversBarrelFile(
  sourceFile: SourceFile,
  resolversData: GenerateMappingData[],
) {
  resolversData
    .sort((a, b) =>
      a.modelName > b.modelName ? 1 : a.modelName < b.modelName ? -1 : 0,
    )
    .forEach(({ modelName, resolverName }) => {
      sourceFile.addExportDeclaration({
        moduleSpecifier: `./${modelName}/${resolverName}`,
        namedExports: [resolverName],
      });
    });
}
export function generateResolversActionsBarrelFile(
  sourceFile: SourceFile,
  resolversData: GenerateMappingData[],
) {
  resolversData
    .sort((a, b) =>
      a.modelName > b.modelName ? 1 : a.modelName < b.modelName ? -1 : 0,
    )
    .forEach(({ modelName, actionResolverNames }) => {
      if (actionResolverNames) {
        actionResolverNames.forEach(actionResolverName => {
          sourceFile.addExportDeclaration({
            moduleSpecifier: `./${modelName}/${actionResolverName}`,
            namedExports: [actionResolverName],
          });
        });
      }
    });
}
export function generateTypeDefsBarrelFile(
  sourceFile: SourceFile,
  resolversData: GenerateMappingData[],
) {
  resolversData
    .sort((a, b) =>
      a.modelName > b.modelName ? 1 : a.modelName < b.modelName ? -1 : 0,
    )
    .forEach(({ modelName, resolverName }) => {
      sourceFile.addExportDeclaration({
        moduleSpecifier: `./${modelName}/${resolverName.replace('Resolver', 'TypeDef')}`,
        namedExports: [resolverName.replace('Resolver', 'TypeDef')],
      });
    });
}

export function generateResolversIndexFile(
  sourceFile: SourceFile,
  type: "crud" | "relations",
  hasSomeArgs: boolean,
) {
  if (type === "crud") {
    sourceFile.addExportDeclarations([
      { moduleSpecifier: `./resolvers-actions.index` },
      { moduleSpecifier: `./resolvers-crud.index` },
    ]);
  } else {
    sourceFile.addExportDeclarations([
      { moduleSpecifier: `./resolvers.index` },
    ]);
  }
  if (hasSomeArgs) {
    sourceFile.addExportDeclarations([{ moduleSpecifier: `./args.index` }]);
  }
}
export function generateTypeDefsIndexFile(
  sourceFile: SourceFile,
  type: "crud" | "relations",
  hasSomeArgs: boolean,
) {
  if (type === "crud") {
    sourceFile.addExportDeclarations([
      { moduleSpecifier: `./typedefs-crud.index` },
    ]);
  } else {
    sourceFile.addExportDeclarations([
      { moduleSpecifier: `./typedefs.index` },
    ]);
  }
  if (hasSomeArgs) {
    sourceFile.addExportDeclarations([{ moduleSpecifier: `./args.index` }]);
  }
}

export const generateModelsImports = createImportGenerator(modelsFolderName);
export const generateEnumsImports = createImportGenerator(enumsFolderName);
export const generateInputsImports = createImportGenerator(inputsFolderName);
export const generateOutputsImports = createImportGenerator(outputsFolderName);
// TODO: unify with generateOutputsImports
export const generateResolversOutputsImports = createImportGenerator(
  `${resolversFolderName}/${outputsFolderName}`,
);
export const generateArgsImports = createImportGenerator(argsFolderName);
function createImportGenerator(elementsDirName: string) {
  return (sourceFile: SourceFile, elementsNames: string[], level = 1) => {
    const distinctElementsNames = [...new Set(elementsNames)].sort();
    for (const elementName of distinctElementsNames) {
      sourceFile.addImportDeclaration({
        moduleSpecifier:
          (level === 0 ? "./" : "") +
          path.posix.join(
            ...Array(level).fill(".."),
            elementsDirName,
            elementName,
          ),
        // TODO: refactor to default exports
        // defaultImport: elementName,
        namedImports: [elementName],
      });
    }
  };
}

// TODO: used by prisma-to-graphql-server
export function generateGQLImport(sourceFile: SourceFile) {
  sourceFile.addImportDeclaration({
    moduleSpecifier: "graphql-tag",
    defaultImport: "gql",
  });
}
